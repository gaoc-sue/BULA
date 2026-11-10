#!/usr/bin/env node
/* Gera os áudios da "Voz do BULA" com o Google Cloud Text-to-Speech (vozes Chirp 3: HD).
   Roda no SEU computador, uma vez. Os MP3 vão para www/voz e entram no APK: o app toca sem internet
   e nenhuma chave fica no app ou no repositório.

   Uso (a chave vai só na variável de ambiente GOOGLE_TTS_KEY, nunca em arquivo):
     node scripts/voz/gerar-voz.js --amostras             gera a mesma frase em 10 vozes (scripts/voz/amostras) para escolher
     node scripts/voz/gerar-voz.js --teste --voz NOME     gera só 1 frase, para conferir a chave
     node scripts/voz/gerar-voz.js --voz NOME             gera todas as frases de scripts/voz/frases.json em www/voz
   NOME é algo como pt-BR-Chirp3-HD-Kore. Rodar de novo só gera o que mudou (frase nova ou outra voz).

   Custo: Chirp 3: HD tem 1 milhão de caracteres grátis por mês; todas as frases somam uns 18 mil.
   Por segurança, o script para se for passar de 100 mil caracteres numa rodada (--sem-limite libera). */
const fs = require('fs'), path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const FRASES = path.join(__dirname, 'frases.json');
const SAIDA = path.join(RAIZ, 'www', 'voz');
const AMOSTRAS = path.join(__dirname, 'amostras');
const LIMITE = 100000;
const VOZES_AMOSTRA = ['Kore', 'Aoede', 'Leda', 'Zephyr', 'Despina', 'Callirrhoe', 'Puck', 'Charon', 'Fenrir', 'Orus'];
const FRASE_AMOSTRA = 'Olá! Eu sou o Bula. Dona Lúcia, horário do remédio da pressão: Losartana, 1 comprimido, conforme a receita.';

const args = process.argv.slice(2);
const tem = n => args.includes(n);
const valor = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

/* o mesmo jeito de comparar frases que o app usa (index.html: normVoz e hashVoz) */
const normVoz = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
function hashVoz(t) { let h = 0x811c9dc5; for (const c of new TextEncoder().encode(t)) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }

const CHAVE = process.env.GOOGLE_TTS_KEY;
if (!CHAVE) {
  console.error('\nFalta a chave. No PowerShell:  $env:GOOGLE_TTS_KEY="sua-chave"');
  console.error('No Prompt de Comando:          set GOOGLE_TTS_KEY=sua-chave');
  console.error('No Mac/Linux:                  export GOOGLE_TTS_KEY=sua-chave\n');
  process.exit(1);
}

async function sintetizar(texto, voz) {
  const r = await fetch(process.env.TTS_URL || 'https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Goog-Api-Key': CHAVE },
    body: JSON.stringify({ input: { text: texto }, voice: { languageCode: 'pt-BR', name: voz }, audioConfig: { audioEncoding: 'MP3' } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
    if (r.status === 403) throw new Error('Acesso negado (403). Confira: API "Cloud Text-to-Speech" ativada, faturamento ativo no projeto e a chave liberada para essa API.\n  Google disse: ' + msg);
    if (r.status === 400 && /voice/i.test(msg)) throw new Error('Voz não encontrada: ' + voz + '. Use um nome como pt-BR-Chirp3-HD-Kore.\n  Google disse: ' + msg);
    throw new Error(msg);
  }
  return Buffer.from(j.audioContent, 'base64');
}

/* textos longos: em partes de até ~4.500 bytes (limite do Google: 5.000), emendando os MP3 */
function partes(texto) {
  if (Buffer.byteLength(texto) <= 4500) return [texto];
  const fr = texto.match(/[^.!?;]+[.!?;]*\s*/g) || [texto], out = []; let at = '';
  for (const f of fr) { if (Buffer.byteLength(at + f) > 4500 && at) { out.push(at.trim()); at = f; } else at += f; }
  if (at.trim()) out.push(at.trim());
  return out;
}
async function audioDe(texto, voz) { const bs = []; for (const p of partes(texto)) bs.push(await sintetizar(p, voz)); return Buffer.concat(bs); }

async function amostras() {
  fs.mkdirSync(AMOSTRAS, { recursive: true });
  console.log('Gerando a mesma frase em ' + VOZES_AMOSTRA.length + ' vozes...');
  for (const v of VOZES_AMOSTRA) {
    const nome = 'pt-BR-Chirp3-HD-' + v;
    try { fs.writeFileSync(path.join(AMOSTRAS, nome + '.mp3'), await audioDe(FRASE_AMOSTRA, nome)); console.log('  ok  ' + nome); }
    catch (e) { console.log('  erro ' + nome + ': ' + e.message); if (/403/.test(e.message)) process.exit(1); }
  }
  console.log('\nOuça os arquivos em scripts/voz/amostras e escolha uma. Depois rode:\n  node scripts/voz/gerar-voz.js --voz pt-BR-Chirp3-HD-NOME\n');
}

async function gerar(voz, so1) {
  const frases = JSON.parse(fs.readFileSync(FRASES, 'utf8'));
  fs.mkdirSync(SAIDA, { recursive: true });
  const arqIdx = path.join(SAIDA, 'indice.json');
  let idx = { v: 1, voz, f: {} };
  try { const velho = JSON.parse(fs.readFileSync(arqIdx, 'utf8')); if (velho.voz === voz && velho.f) idx.f = velho.f; } catch (e) {}

  const novoF = {}, fazer = [];
  for (const fr of frases) {
    const t = normVoz(fr.texto); if (!t) continue;
    const h = hashVoz(t), arq = fr.id + '.mp3', antes = idx.f[h];
    novoF[h] = [arq, t];
    if (!(antes && antes[0] === arq && antes[1] === t && fs.existsSync(path.join(SAIDA, arq)))) fazer.push({ h, arq, t });
  }
  const lista = so1 ? fazer.slice(0, 1) : fazer;
  const total = lista.reduce((s, x) => s + x.t.length, 0);
  console.log(`Voz: ${voz}\nFrases no total: ${Object.keys(novoF).length} · para gerar agora: ${lista.length} · caracteres: ${total}`);
  if (total > LIMITE && !tem('--sem-limite')) { console.error(`Passaria de ${LIMITE} caracteres. Confira o frases.json ou use --sem-limite.`); process.exit(1); }

  let feitos = 0;
  for (const x of lista) {
    try { fs.writeFileSync(path.join(SAIDA, x.arq), await audioDe(x.t, voz)); feitos++; process.stdout.write(`\r  ${feitos}/${lista.length}`); }
    catch (e) { console.error('\nErro em ' + x.arq + ': ' + e.message); if (/403|Voz não encontrada/.test(e.message)) process.exit(1); delete novoF[x.h]; }
  }
  if (so1) { console.log(`\nTeste ok: ${path.join('www', 'voz', lista[0] ? lista[0].arq : '')}. Ouça o arquivo. Se estiver bom, rode sem --teste.`); return; }

  /* apaga MP3 que não estão mais na lista */
  const usados = new Set(Object.values(novoF).map(x => x[0]));
  for (const f of fs.readdirSync(SAIDA)) if (f.endsWith('.mp3') && !usados.has(f)) fs.unlinkSync(path.join(SAIDA, f));
  fs.writeFileSync(arqIdx, JSON.stringify({ v: 1, voz, f: novoF }));
  console.log(`\nPronto: ${Object.keys(novoF).length} frases em www/voz. Agora suba a pasta www/voz para o GitHub e gere o APK.`);
}

(async () => {
  if (tem('--amostras')) return amostras();
  const voz = valor('--voz');
  if (!voz || !/^pt-BR-/.test(voz)) { console.error('Diga a voz: --voz pt-BR-Chirp3-HD-Kore (ou rode --amostras para ouvir e escolher).'); process.exit(1); }
  return gerar(voz, tem('--teste'));
})().catch(e => { console.error('\n' + e.message); process.exit(1); });
