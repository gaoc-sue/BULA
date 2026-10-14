package br.com.remediofalado.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(EnergiaPlugin.class);
        registerPlugin(CofrePlugin.class);
        registerPlugin(EloPlugin.class);
        registerPlugin(ReceitaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
