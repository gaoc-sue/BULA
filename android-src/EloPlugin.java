package br.com.remediofalado.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Ponte entre o app e a conexão com a família que roda com o app fechado (Elo + EloJob). */
@CapacitorPlugin(name = "Elo")
public class EloPlugin extends Plugin {

    /** Recebe a configuração (canais, chaves, horários de hoje) e guarda criptografada pelo Keystore. */
    @PluginMethod
    public void configurar(PluginCall call) {
        String json = call.getString("json");
        if (json == null) { call.reject("Sem configuração."); return; }
        try {
            Elo.salvarConfig(getContext(), json);
            Elo.agendar(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Não consegui guardar a conexão: " + e.getMessage());
        }
    }

    /** Roda uma rodada agora (ex.: logo depois que uma dose passou 30 minutos). */
    @PluginMethod
    public void verificar(PluginCall call) {
        try { Elo.agora(getContext()); } catch (Exception e) { }
        call.resolve();
    }
}
