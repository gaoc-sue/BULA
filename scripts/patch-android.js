// Ajusta o projeto Android gerado pelo Capacitor:
// permissões, leitor de código de barras, ícone da notificação, motor de voz,
// cofre (Android Keystore) e a conexão com a família que roda com o app fechado (JobScheduler).
const fs = require('fs'), path = require('path');
const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const manifestPath = path.join(res, 'AndroidManifest.xml');
let m = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.CAMERA',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.WAKE_LOCK',
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.RECORD_AUDIO'
];
for (const p of perms) {
  if (!m.includes(`"${p}"`)) m = m.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
if (!m.includes('android.hardware.camera')) m = m.replace('</manifest>', '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
if (!m.includes('android.intent.action.TTS_SERVICE')) {
  m = m.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.intent.action.TTS_SERVICE" />\n        </intent>\n    </queries>\n</manifest>');
}
// baixa o leitor de código de barras do Google junto com a instalação do app
if (!m.includes('com.google.mlkit.vision.DEPENDENCIES')) {
  m = m.replace('</application>', '        <meta-data android:name="com.google.mlkit.vision.DEPENDENCIES" android:value="barcode_ui" />\n    </application>');
}
// conexão com a família com o app fechado: tarefa do Android (JobScheduler), sem biblioteca extra
if (!m.includes('br.com.remediofalado.app.EloJob')) {
  m = m.replace('</application>', '        <service android:name="br.com.remediofalado.app.EloJob" android:permission="android.permission.BIND_JOB_SERVICE" android:exported="false" />\n    </application>');
}
// dados de saúde não vão para o backup automático do Google (ficam criptografados só neste aparelho)
m = m.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
if (!m.includes('android:allowBackup')) m = m.replace('<application', '<application android:allowBackup="false"');
fs.writeFileSync(manifestPath, m);
// ícone simples (pílula) para a barra de notificação
const draw = path.join(res, 'res', 'drawable');
fs.mkdirSync(draw, { recursive: true });
fs.writeFileSync(path.join(draw, 'ic_stat_icon.xml'),
`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF" android:pathData="M8,6h8a6,6 0,0 1,0 12h-8a6,6 0,0 1,0 -12zM8,8a4,4 0,0 0,0 8h3v-8z"/>
</vector>
`);
// assinatura fixa: assim cada APK novo instala por cima do anterior, sem apagar os dados
const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradlePath, 'utf8');
if (!g.includes('remedio-falado-teste.jks')) {
  g = g.replace(/android \{/, `android {
    signingConfigs {
        debug {
            storeFile file("../../keystore/remedio-falado-teste.jks")
            storePassword "remediofalado"
            keyAlias "remediofalado"
            keyPassword "remediofalado"
        }
    }`);
}
// plugins próprios: "Energia" (bateria e início automático), "Cofre" (chave no Android Keystore), "Elo" (família) e "Receita" (ler a receita)
const javaDir = path.join(res, 'java', 'br', 'com', 'remediofalado', 'app');
fs.mkdirSync(javaDir, { recursive: true });
for (const f of fs.readdirSync(path.join(__dirname, '..', 'android-src')).filter(n => n.endsWith('.java'))) {
  fs.copyFileSync(path.join(__dirname, '..', 'android-src', f), path.join(javaDir, f));
}
// leitura da receita pela foto (teste): reconhecimento de texto do Google (ML Kit), modelo dentro do app, sem internet
if (!g.includes('com.google.mlkit:text-recognition')) {
  g = g.replace(/dependencies \{/, "dependencies {\n    implementation 'com.google.mlkit:text-recognition:16.0.1'");
}
// número da versão sobe a cada compilação no GitHub
const run = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
g = g.replace(/versionCode \d+/, 'versionCode ' + run).replace(/versionName "[^"]*"/, 'versionName "1.0.' + run + '"');
fs.writeFileSync(gradlePath, g);
console.log('Android ajustado: permissões, ícone de notificação, voz, bateria, cofre e conexão com a família.');
