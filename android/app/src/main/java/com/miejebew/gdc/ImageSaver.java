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
        if (base64Data == null) {
            call.reject("Data base64 tidak boleh kosong.");
            return;
        }

        try {
            // Hapus prefix "data:image/...;base64," jika ada
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
            String filename = "struk-" + System.currentTimeMillis() + ".png";

            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MieJebew");

            Uri uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri != null) {
                OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                if (os != null) {
                    os.write(decodedBytes);
                    os.close();
                    
                    // Kembalikan status sukses ke JavaScript
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
}
