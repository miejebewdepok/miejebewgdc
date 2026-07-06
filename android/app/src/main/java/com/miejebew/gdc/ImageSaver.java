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

@CapacitorPlugin(name = "ImageSaver")
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
}
