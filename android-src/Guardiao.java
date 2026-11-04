package br.com.remediofalado.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.service.notification.StatusBarNotification;

import com.capacitorjs.plugins.localnotifications.LocalNotification;
import com.capacitorjs.plugins.localnotifications.LocalNotificationManager;
import com.capacitorjs.plugins.localnotifications.NotificationStorage;
import com.capacitorjs.plugins.localnotifications.TimedNotificationPublisher;
import com.getcapacitor.CapConfig;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Guardião dos alarmes. O alarme diário do plugin de notificações funciona em corrente: cada vez que toca,
 * marca o do dia seguinte. Se o Android apaga o alarme (economia de bateria, atualização do app) a corrente
 * para, e só voltava quando a pessoa abria o app. A cada 3 horas, e depois de ligar o celular ou atualizar
 * o app, o guardião confere cada lembrete guardado e remarca só os que perderam o alarme.
 * Não remarca um lembrete que está na tela (remarcar apagaria a notificação que a pessoa ainda não viu).
 * Não resolve o "forçar parada": nesse caso o Android apaga também o guardião, até o app ser aberto.
 */
public class Guardiao extends JobService {
    static final int JOB = 7103;
    private static final String PREFS = "guardiao";

    static void agendar(Context ctx) {
        try {
            JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
            if (js == null) return;
            for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == JOB) return;
            js.schedule(new JobInfo.Builder(JOB, new ComponentName(ctx, Guardiao.class))
                    .setPeriodic(3L * 60 * 60 * 1000)
                    .setPersisted(true)
                    .build());
        } catch (Throwable t) { /* sem JobScheduler */ }
    }

    /** remarca os lembretes que perderam o alarme; devolve quantos */
    static int conferir(Context ctx) {
        NotificationStorage st = new NotificationStorage(ctx);
        List<String> ids = st.getSavedNotificationIds();
        Set<Integer> naTela = new HashSet<>();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= 23) {
            try { for (StatusBarNotification s : nm.getActiveNotifications()) naTela.add(s.getId()); } catch (Throwable t) { }
        }
        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
        ArrayList<LocalNotification> faltando = new ArrayList<>();
        for (String id : ids) {
            int n;
            try { n = Integer.parseInt(id); } catch (NumberFormatException e) { continue; }
            if (naTela.contains(n)) continue;
            LocalNotification ln = st.getSavedNotification(id);
            if (ln == null || ln.getSchedule() == null) continue;
            PendingIntent pi = PendingIntent.getBroadcast(ctx, n, new Intent(ctx, TimedNotificationPublisher.class), flags);
            if (pi == null) faltando.add(ln);
        }
        if (!faltando.isEmpty()) {
            new LocalNotificationManager(st, null, ctx, CapConfig.loadDefault(ctx)).schedule(null, faltando);
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putLong("ultimo", System.currentTimeMillis())
                    .putInt("vezes", ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("vezes", 0) + 1)
                    .apply();
        }
        return faltando.size();
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try { conferir(getApplicationContext()); } catch (Throwable t) { }
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
