package com.miejebew.warungos;

import android.app.Notification;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NotificationService extends NotificationListenerService implements TextToSpeech.OnInitListener {
    private static final String TAG = "WarungOS_Soundbox";
    private TextToSpeech tts;
    private boolean isTtsInitialized = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "NotificationService Created");
        tts = new TextToSpeech(this, this);
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            int result = tts.setLanguage(new Locale("id", "ID"));
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "Indonesian language is not supported");
                tts.setLanguage(Locale.getDefault());
            } else {
                Log.d(TAG, "TTS Indonesian Language Initialized Successfully");
                tts.setPitch(0.85f);  // Deeper male voice tone
                tts.setSpeechRate(0.95f); // Good clear speed rate
                isTtsInitialized = true;
            }
        } else {
            Log.e(TAG, "TTS Initialization Failed");
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();
        
        // Filter only merchant & bank apps to avoid false positives (e.g. chats, personal stuff)
        boolean isMerchantApp = packageName.contains("gobiz") || 
                                packageName.contains("shopee.partner") || 
                                packageName.contains("shopeepay.merchant") || 
                                packageName.contains("shopee") || 
                                packageName.contains("grab.merchant") ||
                                packageName.contains("bca") ||
                                packageName.contains("mandiri.livin") ||
                                packageName.contains("bsm.smartmobile") || // BSI
                                packageName.contains("bri") ||
                                packageName.contains("cimb") ||
                                packageName.contains("ovo") ||
                                packageName.contains("dana.merchant") ||
                                packageName.contains("linkaja");

        if (!isMerchantApp) {
            return;
        }

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        String text = extras.getString(Notification.EXTRA_TEXT, "");
        String fullContent = (title + " " + text).toLowerCase();

        Log.d(TAG, "Received merchant notification from " + packageName + " | Title: " + title + " | Text: " + text);

        // Verification keywords for successful payment
        boolean isSuccessPayment = fullContent.contains("berhasil") || 
                                   fullContent.contains("sukses") || 
                                   fullContent.contains("diterima") || 
                                   fullContent.contains("masuk") || 
                                   fullContent.contains("credit") || 
                                   fullContent.contains("kredit") || 
                                   fullContent.contains("ditambahkan") || 
                                   fullContent.contains("transfer");

        if (!isSuccessPayment) {
            return;
        }

        // Regex to search IDR nominal (e.g. 15.000 or Rp 150.000)
        Pattern pattern = Pattern.compile("(?:rp\\.?\\s*)?([0-9]{1,3}(?:\\.[0-9]{3})+)");
        Matcher matcher = pattern.matcher(fullContent);

        if (matcher.find()) {
            String match = matcher.group(1);
            if (match != null) {
                String cleanNum = match.replace(".", "");
                try {
                    long amount = Long.parseLong(cleanNum);
                    if (amount > 0) {
                        speakNotification(amount);
                    }
                } catch (NumberFormatException e) {
                    Log.e(TAG, "Error parsing payment amount", e);
                }
            }
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Ignored
    }

    private void speakNotification(long amount) {
        if (!isTtsInitialized || tts == null) {
            Log.e(TAG, "TTS not initialized, cannot speak");
            return;
        }

        String terbilang = angkaterbilang(amount).trim();
        String textToSpeak = "Sebesar " + terbilang + " rupiah, berhasil diterima.";
        Log.d(TAG, "Speaking: " + textToSpeak);

        Bundle params = new Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
        tts.speak(textToSpeak, TextToSpeech.QUEUE_FLUSH, params, "qris_soundbox_id");
    }

    public static String angkaterbilang(long nilai) {
        String[] bilangan = {
            "", "satu", "dua", "tiga", "empat", "lima",
            "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"
        };
        String temp = "";
        if (nilai < 12) {
            temp = " " + bilangan[(int) nilai];
        } else if (nilai < 20) {
            temp = angkaterbilang(nilai - 10) + " belas";
        } else if (nilai < 100) {
            temp = angkaterbilang(nilai / 10) + " puluh" + angkaterbilang(nilai % 10);
        } else if (nilai < 200) {
            temp = " seratus" + angkaterbilang(nilai - 100);
        } else if (nilai < 1000) {
            temp = angkaterbilang(nilai / 100) + " ratus" + angkaterbilang(nilai % 100);
        } else if (nilai < 2000) {
            temp = " seribu" + angkaterbilang(nilai - 1000);
        } else if (nilai < 1000000) {
            temp = angkaterbilang(nilai / 1000) + " ribu" + angkaterbilang(nilai % 1000);
        } else if (nilai < 1000000000) {
            temp = angkaterbilang(nilai / 1000000) + " juta" + angkaterbilang(nilai % 1000000);
        } else if (nilai < 1000000000000L) {
            temp = angkaterbilang(nilai / 1000000000L) + " milyar" + angkaterbilang(nilai % 1000000000L);
        }
        return temp;
    }
}
