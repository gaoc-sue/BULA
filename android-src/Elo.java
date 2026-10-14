package br.com.remediofalado.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Conexão com a família, com o app fechado.
 * A cada 15 minutos (JobScheduler do Android):
 *  - no celular de quem toma o remédio: se uma dose passou 30 minutos sem ser marcada, manda o aviso para a família;
 *  - nos dois celulares: busca mensagens novas e mostra a notificação;
 *  - no celular de quem cuida dos remédios (modo gestor): reenvia, de 6 em 6 horas, a mudança que o outro celular ainda não confirmou.
 * Tudo que passa pelo servidor vai criptografado de ponta a ponta (AES-256-GCM). O servidor não consegue ler.
 */
final class Elo {
    static final int JOB_PERIODICO = 7101;
    static final int JOB_AGORA = 7102;
    private static final String PREFS = "remedio_falado_elo";
    private static final String CANAL = "familia";
    private static final long PULSO_MS = 2L * 60 * 60 * 1000;
    private static final long REENVIO_MS = 6L * 60 * 60 * 1000;
    private static final long DESISTE_MS = 3L * 24 * 60 * 60 * 1000;

    private Elo() {}

    static void salvarConfig(Context ctx, String json) throws Exception {
        Cofre.guardar(ctx, "elo", json);
    }

    static JSONObject config(Context ctx) {
        try {
            String s = Cofre.ler(ctx, "elo");
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) { return null; }
    }

    static boolean temCanais(JSONObject cfg) {
        JSONArray c = cfg == null ? null : cfg.optJSONArray("canais");
        return c != null && c.length() > 0;
    }

    static void agendar(Context ctx) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        if (!temCanais(config(ctx))) { js.cancel(JOB_PERIODICO); return; }
        for (JobInfo j : js.getAllPendingJobs()) if (j.getId() == JOB_PERIODICO) return;
        js.schedule(new JobInfo.Builder(JOB_PERIODICO, new ComponentName(ctx, EloJob.class))
                .setPeriodic(15L * 60 * 1000)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .build());
    }

    static void agora(Context ctx) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null || !temCanais(config(ctx))) return;
        js.schedule(new JobInfo.Builder(JOB_AGORA, new ComponentName(ctx, EloJob.class))
                .setMinimumLatency(0)
                .setOverrideDeadline(10000)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .build());
    }

    /* ---------------- o trabalho de cada rodada ---------------- */
    static synchronized void executar(Context ctx) {
        JSONObject cfg = config(ctx);
        if (!temCanais(cfg)) return;
        SharedPreferences st = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String relay = cfg.optString("relay", "https://ntfy.sh");
        JSONArray canais = cfg.optJSONArray("canais");

        // canais em que este celular é de quem toma o remédio (os outros: este celular acompanha alguém)
        JSONArray meus = new JSONArray();
        for (int i = 0; i < canais.length(); i++) {
            JSONObject c = canais.optJSONObject(i);
            if (c != null && "idoso".equals(c.optString("papel", "idoso"))) meus.put(c);
        }
        if (meus.length() > 0) avisarAtrasos(ctx, cfg, st, relay, meus);

        for (int i = 0; i < canais.length(); i++) {
            JSONObject c = canais.optJSONObject(i);
            if (c == null) continue;
            String papel = c.optString("papel", "idoso");
            String topic = c.optString("topic"), key = c.optString("key");
            if (topic.isEmpty() || key.isEmpty()) continue;
            JSONArray pend = c.optJSONArray("pend");
            try { buscar(ctx, st, relay, topic, key, papel, c.optLong("visto", 0), pend); } catch (Exception e) { /* sem internet: tenta na próxima */ }
            if ("familia".equals(papel) && pend != null && pend.length() > 0) reenviar(st, relay, topic, pend);
            // sinal de vida: reenvia o último resumo de 2 em 2 horas (já criptografado pelo app)
            String estado = c.optString("estado", "");
            if ("idoso".equals(papel) && !estado.isEmpty() && System.currentTimeMillis() - st.getLong("pulso:" + topic, 0) > PULSO_MS) {
                try { publicar(relay, topic, estado); st.edit().putLong("pulso:" + topic, System.currentTimeMillis()).apply(); } catch (Exception e) { }
            }
        }
    }

    private static int minutosAgora() {
        Calendar c = Calendar.getInstance();
        return c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
    }

    private static String hoje() {
        Calendar c = Calendar.getInstance();
        return String.format(java.util.Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    private static int toMin(String hm) {
        try { String[] p = hm.split(":"); return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]); } catch (Exception e) { return -1; }
    }

    private static void avisarAtrasos(Context ctx, JSONObject cfg, SharedPreferences st, String relay, JSONArray canais) {
        String dia = hoje();
        int agora = minutosAgora();
        Set<String> tomados = new HashSet<>();
        if (dia.equals(cfg.optString("dia"))) {
            JSONArray t = cfg.optJSONArray("tomados");
            if (t != null) for (int i = 0; i < t.length(); i++) tomados.add(t.optString(i));
        }
        Set<String> avisados = new HashSet<>(st.getStringSet("avisados", new HashSet<String>()));
        JSONArray jsAvisados = cfg.optJSONArray("avisados");
        if (jsAvisados != null) for (int i = 0; i < jsAvisados.length(); i++) avisados.add(jsAvisados.optString(i));
        JSONArray doses = cfg.optJSONArray("doses");
        if (doses == null) return;
        boolean mudou = false;
        for (int i = 0; i < doses.length(); i++) {
            JSONObject d = doses.optJSONObject(i);
            if (d == null) continue;
            String h = d.optString("h");
            int m = toMin(h);
            if (m < 0 || agora < m + 30 || agora > m + 240 || tomados.contains(h)) continue;
            String k = dia + "|" + h;
            if (avisados.contains(k)) continue;
            try {
                JSONObject msg = new JSONObject();
                msg.put("de", "idoso"); msg.put("t", "atraso"); msg.put("dia", dia); msg.put("h", h);
                msg.put("ts", System.currentTimeMillis());
                JSONObject av = new JSONObject();
                av.put("titulo", d.optString("titulo")); av.put("texto", d.optString("texto"));
                msg.put("aviso", av);
                for (int j = 0; j < canais.length(); j++) {
                    JSONObject c = canais.optJSONObject(j);
                    if (c == null) continue;
                    publicar(relay, c.optString("topic"), cifrar(c.optString("key"), msg.toString()));
                }
                avisados.add(k); mudou = true;
            } catch (Exception e) { /* sem internet: tenta na próxima rodada */ }
        }
        if (mudou) {
            // guarda só os dos últimos dias
            Set<String> recentes = new HashSet<>();
            for (String a : avisados) if (a.compareTo(diaAntes(3)) >= 0) recentes.add(a);
            st.edit().putStringSet("avisados", recentes).apply();
        }
    }

    private static String diaAntes(int n) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, -n);
        return String.format(java.util.Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /* modo gestor: a mudança vai de novo enquanto o celular de quem toma não confirmar (o servidor guarda só por algumas horas) */
    private static void reenviar(SharedPreferences st, String relay, String topic, JSONArray pend) {
        Set<String> conf = st.getStringSet("conf:" + topic, new HashSet<String>());
        long agora = System.currentTimeMillis();
        SharedPreferences.Editor ed = st.edit();
        for (int i = 0; i < pend.length(); i++) {
            JSONObject p = pend.optJSONObject(i);
            if (p == null) continue;
            String uid = p.optString("uid"), cif = p.optString("cif");
            long ts = p.optLong("ts", agora);
            if (uid.isEmpty() || cif.isEmpty() || conf.contains(uid) || agora - ts > DESISTE_MS) continue;
            long ultimo = st.getLong("reenv:" + uid, ts);
            if (agora - ultimo < REENVIO_MS) continue;
            try { publicar(relay, topic, cif); ed.putLong("reenv:" + uid, agora); } catch (Exception e) { break; }
        }
        ed.apply();
    }

    /* o resumo que chega do celular de quem toma confirma o que já foi aplicado */
    private static void confirmar(SharedPreferences st, String topic, JSONObject estado, JSONArray pend) {
        if (pend == null) return;
        Set<String> ids = new HashSet<>();
        JSONArray ag = estado.optJSONArray("ag");
        if (ag != null) for (int i = 0; i < ag.length(); i++) { JSONObject a = ag.optJSONObject(i); if (a != null) ids.add(a.optString("id")); }
        long ts = estado.optLong("ts", 0);
        Set<String> conf = new HashSet<>(st.getStringSet("conf:" + topic, new HashSet<String>()));
        for (int i = 0; i < pend.length(); i++) {
            JSONObject p = pend.optJSONObject(i);
            if (p == null || ts <= p.optLong("ts", 0)) continue;
            boolean tem = ids.contains(p.optString("id"));
            if ("del".equals(p.optString("op")) ? !tem : tem) conf.add(p.optString("uid"));
        }
        if (conf.size() > 80) conf.clear();
        st.edit().putStringSet("conf:" + topic, conf).apply();
    }

    private static void buscar(Context ctx, SharedPreferences st, String relay, String topic, String key, String papel, long vistoApp, JSONArray pend) throws Exception {
        long desde = Math.max(st.getLong("desde:" + topic, 0), vistoApp);
        if (desde == 0) desde = System.currentTimeMillis() / 1000 - 15 * 60;
        Set<String> vistos = new HashSet<>(st.getStringSet("ids:" + topic, new HashSet<String>()));
        Set<String> uids = new HashSet<>(st.getStringSet("uids:" + topic, new HashSet<String>()));
        HttpURLConnection c = (HttpURLConnection) new URL(relay + "/" + topic + "/json?poll=1&since=" + desde).openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(20000);
        long maior = desde;
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
            String linha;
            while ((linha = r.readLine()) != null) {
                if (linha.trim().isEmpty()) continue;
                JSONObject ev = new JSONObject(linha);
                if (!"message".equals(ev.optString("event"))) continue;
                String id = ev.optString("id");
                long t = ev.optLong("time", 0);
                if (t > maior) maior = t;
                if (vistos.contains(id) || t < vistoApp) continue;
                vistos.add(id);
                String txt;
                try { txt = decifrar(key, ev.optString("message")); } catch (Exception e) { continue; }
                JSONObject msg = new JSONObject(txt);
                if (papel.equals(msg.optString("de"))) continue;
                if ("familia".equals(papel) && "estado".equals(msg.optString("t"))) { confirmar(st, topic, msg, pend); continue; }
                String uid = msg.optString("uid", "");
                if (!uid.isEmpty()) { if (uids.contains(uid)) continue; uids.add(uid); } // mudança reenviada: avisa uma vez só
                JSONObject av = msg.optJSONObject("aviso");
                if (av != null) notificar(ctx, av.optString("titulo"), av.optString("texto"), id.hashCode());
            }
        } finally { c.disconnect(); }
        if (vistos.size() > 60) vistos.clear();
        if (uids.size() > 80) uids.clear();
        st.edit().putLong("desde:" + topic, maior).putStringSet("ids:" + topic, vistos).putStringSet("uids:" + topic, uids).apply();
    }

    /* ---------------- servidor de passagem (ntfy) ---------------- */
    static void publicar(String relay, String topic, String corpo) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(relay + "/" + topic).openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(20000);
        c.setRequestMethod("POST"); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "text/plain; charset=utf-8");
        byte[] b = corpo.getBytes(StandardCharsets.UTF_8);
        try (OutputStream o = c.getOutputStream()) { o.write(b); }
        int code = c.getResponseCode();
        c.disconnect();
        if (code >= 300) throw new Exception("relay " + code);
    }

    /* ---------------- criptografia de ponta a ponta: rfe1.<iv>.<texto cifrado> ---------------- */
    private static final int B64 = Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP;

    static String cifrar(String chaveB64, String texto) throws Exception {
        byte[] k = Base64.decode(chaveB64, B64);
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(k, "AES"), new GCMParameterSpec(128, iv));
        byte[] ct = c.doFinal(texto.getBytes(StandardCharsets.UTF_8));
        return "rfe1." + Base64.encodeToString(iv, B64) + "." + Base64.encodeToString(ct, B64);
    }

    static String decifrar(String chaveB64, String env) throws Exception {
        String[] p = env.split("\\.");
        if (p.length != 3 || !"rfe1".equals(p[0])) throw new Exception("formato");
        byte[] k = Base64.decode(chaveB64, B64);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(k, "AES"), new GCMParameterSpec(128, Base64.decode(p[1], B64)));
        return new String(c.doFinal(Base64.decode(p[2], B64)), StandardCharsets.UTF_8);
    }

    /* ---------------- notificação ---------------- */
    static void notificar(Context ctx, String titulo, String texto, int id) {
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel(CANAL, "Avisos da família", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("Avisos do celular de quem você acompanha, ou da família que acompanha você.");
                nm.createNotificationChannel(ch);
            }
            Intent abrir = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            PendingIntent pi = abrir == null ? null : PendingIntent.getActivity(ctx, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            int icone = ctx.getResources().getIdentifier("ic_stat_icon", "drawable", ctx.getPackageName());
            if (icone == 0) icone = android.R.drawable.ic_dialog_info;
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CANAL) : new Notification.Builder(ctx);
            b.setSmallIcon(icone).setContentTitle(titulo).setContentText(texto)
                    .setStyle(new Notification.BigTextStyle().bigText(texto))
                    .setAutoCancel(true);
            if (pi != null) b.setContentIntent(pi);
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH);
            nm.notify(id, b.build());
        } catch (Exception e) { /* sem permissão de notificação */ }
    }
}
