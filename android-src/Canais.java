package br.com.remediofalado.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Canais de notificação do BULA, cada um com o seu som.
 * O Android trava o som de um canal depois de criado: para trocar um som no futuro, use um id novo
 * (ex.: "bula_alarme2") e apague o antigo aqui.
 */
final class Canais {
    /** hora do remédio: som do BULA tocando como despertador (vale com o celular no silencioso) */
    static final String ALARME = "bula_alarme";
    /** avisos da família e do estoque: versão curta do som do BULA */
    static final String AVISO = "bula_aviso";
    /** "marcou que tomou": sem som e sem vibrar */
    static final String TOMOU = "tomou";
    /** canais antigos, sem o som do BULA */
    private static final String[] ANTIGOS = {"familia"};

    private Canais() {}

    static Uri som(Context ctx, String nome) {
        return Uri.parse("android.resource://" + ctx.getPackageName() + "/raw/" + nome);
    }

    static void criar(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationChannel a = new NotificationChannel(ALARME, "Hora do remédio", NotificationManager.IMPORTANCE_HIGH);
            a.setDescription("Toca o som do BULA na hora de cada remédio, como um despertador. Toca mesmo com o celular no silencioso.");
            a.setSound(som(ctx, "bula_alarme"), new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            a.enableVibration(true);
            a.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 800});
            a.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(a);

            NotificationChannel v = new NotificationChannel(AVISO, "Avisos da família e do estoque", NotificationManager.IMPORTANCE_HIGH);
            v.setDescription("Remédio atrasado, remédio acabando e recados da família. Toca o som curto do BULA.");
            v.setSound(som(ctx, "bula_aviso"), new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            v.enableVibration(true);
            nm.createNotificationChannel(v);

            NotificationChannel t = new NotificationChannel(TOMOU, "Remédio tomado (sem som)", NotificationManager.IMPORTANCE_LOW);
            t.setDescription("Quando a pessoa que você acompanha marca que tomou o remédio. Não toca nem vibra.");
            nm.createNotificationChannel(t);

            for (String id : ANTIGOS) nm.deleteNotificationChannel(id);
        } catch (Exception e) { /* sem serviço de notificação */ }
    }
}
