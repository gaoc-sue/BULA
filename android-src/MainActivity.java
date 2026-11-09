package br.com.remediofalado.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** o app está na tela: ele mesmo confere as mensagens (Carteiro não precisa buscar) */
    static volatile boolean naTela = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // os canais com o som do BULA nascem antes do app agendar qualquer alarme
        Canais.criar(this);
        // guardião dos alarmes: confere a cada 3 horas se algum lembrete perdeu o alarme
        Guardiao.agendar(this);
        registerPlugin(EnergiaPlugin.class);
        registerPlugin(CofrePlugin.class);
        registerPlugin(EloPlugin.class);
        registerPlugin(ReceitaPlugin.class);
        super.onCreate(savedInstanceState);
        acordar(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        acordar(intent);
    }

    /** aberto pela notificação do remédio (tocada ou em tela cheia): aparece por cima da tela de bloqueio e acende a tela */
    private void acordar(Intent intent) {
        if (intent != null && intent.hasExtra("LocalNotificationId") && Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
    }

    @Override
    public void onResume() { super.onResume(); naTela = true; }

    @Override
    public void onPause() { naTela = false; super.onPause(); }
}
