package com.miejebew.gdc;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.DownloadListener;
import android.util.Base64;
import android.os.Environment;
import android.widget.Toast;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.net.Uri;
import java.io.OutputStream;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        // Izinkan audio/media berputar otomatis tanpa interaksi layar (menembus aturan autoplay Android)
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Pasang DownloadListener untuk menangani unduhan gambar struk (base64 data URL) langsung ke galeri HP
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    if (url != null && url.startsWith("data:")) {
                        try {
                            String base64Data = url.substring(url.indexOf(",") + 1);
                            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

                            String filename = "struk-" + System.currentTimeMillis() + ".png";

                            ContentValues values = new ContentValues();
                            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
                            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                            values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MieJebew");

                            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                            if (uri != null) {
                                OutputStream os = getContentResolver().openOutputStream(uri);
                                if (os != null) {
                                    os.write(decodedBytes);
                                    os.close();
                                    Toast.makeText(MainActivity.this, "Gambar struk berhasil diunduh ke Galeri!", Toast.LENGTH_LONG).show();
                                } else {
                                    throw new Exception("Gagal membuka stream penyimpanan.");
                                }
                            } else {
                                throw new Exception("Gagal membuat entri media.");
                            }
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "Gagal mengunduh gambar: " + e.getMessage(), Toast.LENGTH_LONG).show();
                            e.printStackTrace();
                        }
                    }
                }
            });
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Paksa WebView untuk menulis cookie dari RAM ke disk saat aplikasi beralih ke background/ditutup
        try {
            android.webkit.CookieManager.getInstance().flush();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
