package com.miejebew.gdc;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import android.Manifest;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "ImageSaver",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = { Manifest.permission.BLUETOOTH_CONNECT }
        )
    }
)
public class ImageSaver extends Plugin {
    @PluginMethod
    public void saveBase64Image(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename");

        if (base64Data == null) {
            call.reject("Data base64 tidak boleh kosong.");
            return;
        }

        try {
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
            if (filename == null || filename.isEmpty()) {
                filename = "struk-" + System.currentTimeMillis() + ".png";
            }

            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MieJebew");
            values.put(MediaStore.Images.Media.IS_PENDING, 1);

            Uri uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri != null) {
                OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                if (os != null) {
                    os.write(decodedBytes);
                    os.close();

                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    getContext().getContentResolver().update(uri, values, null, null);

                    JSObject ret = new JSObject();
                    ret.put("path", uri.toString());
                    call.resolve(ret);
                } else {
                    call.reject("Gagal membuka stream penyimpanan.");
                }
            } else {
                call.reject("Gagal membuat entri media di galeri.");
            }
        } catch (Exception e) {
            call.reject("Error saat menyimpan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printPage(PluginCall call) {
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    android.webkit.WebView webView = getBridge().getWebView();
                    if (webView != null) {
                        android.print.PrintManager printManager = (android.print.PrintManager) getActivity().getSystemService(android.content.Context.PRINT_SERVICE);
                        if (printManager != null) {
                            String jobName = "Struk Mie Jebew " + System.currentTimeMillis();
                            android.print.PrintDocumentAdapter printAdapter;
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                                printAdapter = webView.createPrintDocumentAdapter(jobName);
                            } else {
                                printAdapter = webView.createPrintDocumentAdapter();
                            }
                            printManager.print(jobName, printAdapter, new android.print.PrintAttributes.Builder().build());
                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            call.resolve(ret);
                        } else {
                            call.reject("PrintManager tidak tersedia di perangkat ini.");
                        }
                    } else {
                        call.reject("WebView tidak ditemukan.");
                    }
                } catch (Exception e) {
                    call.reject("Gagal mencetak: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void printBluetooth(PluginCall call) {
        String base64Bytes = call.getString("bytes");
        if (base64Bytes == null) {
            call.reject("Data cetak tidak boleh kosong.");
            return;
        }

        byte[] decodedBytes;
        try {
            decodedBytes = Base64.decode(base64Bytes, Base64.DEFAULT);
        } catch (Exception e) {
            call.reject("Format base64 salah: " + e.getMessage());
            return;
        }

        // Check/request bluetooth permission first on Android 12+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            if (!hasPermission("bluetooth")) {
                requestPermissionForAlias("bluetooth", call, "bluetoothPermissionCallback");
                return;
            }
        }

        sendToPrinter(decodedBytes, call);
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        if (hasPermission("bluetooth")) {
            String base64Bytes = call.getString("bytes");
            byte[] decodedBytes = Base64.decode(base64Bytes, Base64.DEFAULT);
            sendToPrinter(decodedBytes, call);
        } else {
            call.reject("Izin akses Bluetooth ditolak oleh pengguna.");
        }
    }

    private void sendToPrinter(byte[] bytes, PluginCall call) {
        try {
            android.bluetooth.BluetoothAdapter bluetoothAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
            if (bluetoothAdapter == null) {
                call.reject("Perangkat ini tidak mendukung Bluetooth.");
                return;
            }

            if (!bluetoothAdapter.isEnabled()) {
                call.reject("Bluetooth tidak aktif. Harap nyalakan Bluetooth Anda terlebih dahulu.");
                return;
            }

            java.util.Set<android.bluetooth.BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            android.bluetooth.BluetoothDevice printerDevice = null;

            for (android.bluetooth.BluetoothDevice device : pairedDevices) {
                String name = device.getName();
                if (name != null) {
                    name = name.toLowerCase();
                    if (name.contains("rpp02n") || name.contains("printer") || name.contains("pos58") || name.contains("pos-58") || name.contains("mpt-ii") || name.contains("thermal") || name.contains("innerprinter") || name.contains("rt-printer")) {
                        printerDevice = device;
                        break;
                    }
                }
            }

            if (printerDevice == null) {
                call.reject("Printer thermal Bluetooth tidak ditemukan di daftar perangkat terpasang. Harap hubungkan/pairing printer Anda di pengaturan HP terlebih dahulu.");
                return;
            }

            final android.bluetooth.BluetoothDevice finalDevice = printerDevice;
            final byte[] finalBytes = bytes;

            // Run in background thread to avoid blocking main UI thread
            new Thread(new Runnable() {
                @Override
                public void run() {
                    android.bluetooth.BluetoothSocket socket = null;
                    try {
                        java.util.UUID uuid = java.util.UUID.fromString("00001101-0000-1000-8000-00805F9B34FB"); // SPP UUID
                        socket = finalDevice.createRfcommSocketToServiceRecord(uuid);
                        socket.connect();

                        java.io.OutputStream os = socket.getOutputStream();
                        os.write(finalBytes);
                        os.flush();
                        
                        // Wait a little before closing socket to ensure data transmission
                        Thread.sleep(500);

                        socket.close();

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                    } catch (Exception e) {
                        try {
                            if (socket != null) socket.close();
                        } catch (Exception ex) {}
                        call.reject("Gagal tersambung ke printer: " + e.getMessage() + ". Pastikan printer menyala dan tidak sedang terhubung ke perangkat lain.");
                    }
                }
            }).start();

        } catch (SecurityException se) {
            call.reject("Gagal mengakses Bluetooth karena masalah perizinan: " + se.getMessage());
        } catch (Exception e) {
            call.reject("Error cetak: " + e.getMessage());
        }
    }
}
