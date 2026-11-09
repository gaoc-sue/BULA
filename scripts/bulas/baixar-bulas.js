#!/usr/bin/env node
/* Baixa muitas bulas do paciente oficiais (Bulário Eletrônico da Anvisa) para irem DENTRO do app.

   Rode no SEU computador, no Brasil: a Anvisa costuma bloquear servidores de fora (GitHub Actions).
   Precisa do Node 18 ou mais novo (https://nodejs.org) e de "npm install" uma vez na pasta do projeto.

     node scripts/bulas/baixar-bulas.js              # até 800 remédios (os que mais aparecem nas farmácias)
     node scripts/bulas/baixar-bulas.js --max 1200   # mais remédios
     node scripts/bulas/baixar-bulas.js --so-indice  # só refaz o índice (sem internet)

   Se a Anvisa recusar (403 "Just a moment...", proteção contra robôs), use o navegador:
     node scripts/bulas/baixar-bulas.js --navegador         # cria scripts/bulas/no-navegador.txt
       → abra consultas.anvisa.gov.br no Chrome, F12 → Console, cole o texto do arquivo e aperte Enter;
         o Chrome baixa arquivos bulas-lote-*.json (permita "vários downloads")
     node scripts/bulas/baixar-bulas.js --lotes "C:\Users\voce\Downloads"   # lê os lotes e monta as bulas

   Pode parar com Ctrl+C e rodar de novo: o que já baixou fica guardado e ele continua de onde parou.

   Como escolhe: junta os códigos de barras da lista CMED (www/base.json) por substância e por tipo
   (comprimido/xarope, pomada, colírio, spray). Os mais comuns primeiro; os da Farmácia Popular
   (scripts/bulas/lista.txt) vêm na frente de todos. Injetável e uso hospitalar ficam de fora.
   Para cada um, baixa a bula do registro com mais códigos de barras.

   Saída: www/bulas/indice.json e pacotes www/bulas/b00.json, b01.json... (40 bulas em cada; poucos arquivos,
   para caber no envio pelo site do GitHub, que aceita até 100 arquivos por vez).
   Enquanto baixa, cada bula fica em scripts/bulas/baixadas/ (não precisa subir essa pasta).
   No app, a caixa lida abre a bula do próprio registro; se não tiver, a de outra marca com a mesma
   substância e o mesmo tipo, com o aviso "pode ter pequenas diferenças".

   Regra do projeto: o app não fala o nome do fabricante. Saem os dizeres legais, CNPJ, SAC, endereço e
   qualquer linha com o nome da empresa dona do registro. */
'use strict';
const fs = require('fs'), path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const WWW = path.join(RAIZ, 'www'), SAIDA = path.join(WWW, 'bulas'), PASTA = path.join(__dirname, 'baixadas'), POR_PACOTE = 40;
const ANVISA = process.env.ANVISA_URL || 'https://consultas.anvisa.gov.br/api/consulta';
/* o site da Anvisa recusa (403) pedidos que não parecem de navegador: vai com os mesmos cabeçalhos do Chrome */
const HDR = { Authorization: 'Guest', Accept: 'application/json, text/plain, */*', Referer: 'https://consultas.anvisa.gov.br/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'same-origin' };
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const MAX = +(arg('--max') || 800), ESPERA = +(arg('--espera') || 900);
const dorme = ms => new Promise(r => setTimeout(r, ms));

/* mesmo critério do app (www/index.html, tipoBula) */
function tipoBula(apres) {
  const a = ' ' + String(apres || '').toUpperCase() + ' ';
  if (/\bINJ\b|\bAMP\b|\bSOL INFUS/.test(a)) return 'inj';
  if (/\bOFT\b|\bCOL\b/.test(a)) return 'olho';
  if (/\bCREM\b|\bPOM\b|\bGEL\b|\bLOC\b|\bDERM\b|\bUNG\b|\bTOP\b/.test(a)) return 'pele';
  if (/\bAER\b|\bINAL\b|\bNAS\b|\bSPR\b/.test(a)) return 'nariz';
  if (/\bVAG\b|\bSUP\b|\bRET\b|\bOVL\b/.test(a)) return 'outro';
  if (/\bCOM\b|\bCAP\b|\bDRG\b|\bPAST\b|\bGRAN\b|\bXPE\b|\bGOT\b|\bELX\b|\bPO\b|\bSACHE\b|\bOR\b/.test(a)) return 'oral';
  return 'outro';
}
const reg9 = r => String(r || '').replace(/\D/g, '').slice(0, 9);

/* ---------- quais remédios ---------- */
function escolher() {
  const base = JSON.parse(fs.readFileSync(path.join(WWW, 'base.json'), 'utf8'));
  const it = base.itens, subs = base.substancias;
  const pares = new Map();
  for (const idx of Object.values(base.codigos)) {
    const x = it[idx]; if (x[6]) continue;                       /* uso hospitalar */
    const t = tipoBula(x[2]); if (t === 'inj' || t === 'outro') continue;
    const k = subs[x[0]] + '|' + t, r = reg9(x[4]); if (!r) continue;
    const p = pares.get(k) || { k, n: 0, regs: new Map() }; p.n++; p.regs.set(r, (p.regs.get(r) || 0) + 1); pares.set(k, p);
  }
  /* Farmácia Popular e os já escolhidos antes vão na frente */
  const prio = new Set();
  try { fs.readFileSync(path.join(__dirname, 'lista.txt'), 'utf8').split('\n').map(l => reg9(l.split('#')[0])).filter(Boolean).forEach(r => prio.add(r)); } catch (e) {}
  const lista = [...pares.values()].map(p => ({ k: p.k, n: p.n, regs: [...p.regs.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]), prio: [...p.regs.keys()].some(r => prio.has(r)) }));
  lista.sort((a, b) => (b.prio - a.prio) || (b.n - a.n));
  /* registro → chave (para o índice), de todos os itens */
  const chaveDe = {};
  it.forEach(x => { const r = reg9(x[4]); if (r && !chaveDe[r]) chaveDe[r] = subs[x[0]] + '|' + tipoBula(x[2]); });
  return { lista, chaveDe, total: lista.reduce((s, p) => s + p.n, 0) };
}

/* ---------- Anvisa ---------- */
let ultimoErro = '';
async function pedir(url, tipo) {
  for (let t = 0; t < 3; t++) {
    let r;
    try { r = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(60000) }); }
    catch (e) { ultimoErro = 'sem conexão: ' + e.message; if (t === 2) throw new Error('sem-conexao'); await dorme(5000 * (t + 1)); continue; }
    if (r.ok) return tipo === 'pdf' ? new Uint8Array(await r.arrayBuffer()) : await r.json();
    const corpo = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
    ultimoErro = `HTTP ${r.status} em ${url.replace(ANVISA, '')}: ${corpo}`;
    if (r.status === 404) return null;
    if (r.status === 403 || r.status === 401) { const e = new Error('bloqueado'); e.status = r.status; throw e; }   /* não adianta insistir */
    if (r.status === 429) { console.log('   a Anvisa pediu para ir mais devagar; espero 1 minuto...'); await dorme(60000); continue; }
    if (t === 2) throw new Error('http ' + r.status);
    await dorme(5000 * (t + 1));
  }
}
const q = o => Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
async function baixar(r) {
  const busca = await pedir(`${ANVISA}/bulario?${q({ count: '10', page: '1', 'filter[numeroRegistro]': r })}`);
  const prod = ((busca && busca.content) || [])[0]; if (!prod) throw new Error('nao-achou');
  await dorme(ESPERA);
  const hist = await pedir(`${ANVISA}/bulario/${prod.idProduto}?${q({ count: '5' })}`);
  const v = (((hist && hist.historico) || {}).content || []).filter(x => x.idBulaPaciente || x.idBulaPacienteProtegido)
    .sort((a, b) => String(b.dataPublicacao).localeCompare(String(a.dataPublicacao)))[0];
  if (!v) throw new Error('sem-bula');
  await dorme(ESPERA);
  const pdf = await pedir(`${ANVISA}/medicamentos/arquivo/bula/parecer/${v.idBulaPaciente || v.idBulaPacienteProtegido}/?Authorization=`, 'pdf');
  if (!pdf) throw new Error('sem-pdf');
  const secoes = await extrairSecoes(pdf, prod.razaoSocial || '');
  if (Object.keys(secoes).length < 6) throw new Error('nao-leu');
  return { registro: r, produto: prod.nomeProduto || '', data: String(v.dataPublicacao || prod.data || '').slice(0, 10),
    fonte: 'Bula do paciente oficial (Bulário Eletrônico da Anvisa)', secoes };
}

/* ---------- PDF → 9 perguntas (mesma leitura do app: www/index.html, extrairSecoes) ---------- */
let pdfjs = null;
function carregarPdfjs() {
  if (pdfjs) return pdfjs;
  try { pdfjs = require(path.join(RAIZ, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.js')); }
  catch (e) { try { pdfjs = require('pdfjs-dist/legacy/build/pdf.js'); } catch (x) { console.error('\nFalta o leitor de PDF. Rode antes, na pasta do projeto:  npm install\n'); process.exit(1); } }
  return pdfjs;
}
async function linhasDoPdf(bytes) {
  const doc = await carregarPdfjs().getDocument({ data: bytes, verbosity: 0, useSystemFonts: true }).promise, paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent(), linhas = []; let y = null, at = '';
    tc.items.forEach(it => { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2 && at.trim()) { linhas.push(at); at = ''; } at += it.str; y = yy; if (it.hasEOL) { if (at.trim()) linhas.push(at); at = ''; } });
    if (at.trim()) linhas.push(at);
    paginas.push(linhas.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean));
  }
  await doc.destroy();
  const conta = {}; paginas.forEach(pg => [...new Set(pg)].forEach(l => conta[l] = (conta[l] || 0) + 1));
  const rep = l => paginas.length > 2 && conta[l] >= Math.ceil(paginas.length / 2);
  return paginas.reduce((acc, pg) => acc.concat(pg.filter(l => !rep(l))), []);
}
const LIXO_BULA = /(_VPS?\b|VPS?_V\d|_V\d{1,3}\b|^V\d{2,3}$|CNPJ|\bSAC\b|Ltda|\bS\.?\/?A\.?\b|Farm\.?\s*Resp|Respons[áa]vel\s+t[ée]cnic|Registrado\s+(e\s+produzido\s+)?por|Fabricado\s+por|Embalado\s+por|Produzido\s+por|Importado\s+por|www\.|@|Ind[úu]stria\s+Brasileira|^\s*\d+\s*(de|\/)\s*\d+\s*$|^\s*\d{1,3}\s*$)/i;
const maiusc = t => { const l = t.replace(/[^A-Za-zÀ-ÿ]/g, ''); return l.length > 5 && l.replace(/[^A-ZÀ-Þ]/g, '').length / l.length > 0.8; };
const GENERICAS = /^(LABORAT|FARMAC|IND[UÚ]STRIA|BRASIL|COM[EÉ]RCIO|PRODUTOS|LTDA|PHARMA|FARMA|QU[IÍ]MICA|NACIONAL|MEDICAMENTOS|DISTRIBUIDORA|IMPORTA|EXPORTA|COMPANHIA|GRUPO|GEN[EÉ]RICOS)/i;
async function extrairSecoes(bytes, empresa) {
  const ls = await linhasDoPdf(bytes);
  const pals = String(empresa).split(/[^A-Za-zÀ-ÿ]+/).filter(w => w.length >= 4 && !GENERICAS.test(w)).slice(0, 2);
  const emp = pals.length ? new RegExp('\\b(' + pals.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i') : null;
  const sec = {}; let n = 0, buf = [];
  const fecha = () => { if (n) sec[n] = buf; buf = []; };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/DIZERES LEGAIS|HIST[ÓO]RICO DE ALTERA/i.test(l) || (n >= 9 && /^III\s*[-–).]/.test(l))) break;
    const m = /^([1-9])\s*[.)\-–]\s*(.+)$/.exec(l);
    if (m && +m[1] === n + 1 && maiusc(m[2])) {
      let t = m[2]; while (!/\?\s*$/.test(t) && i + 1 < ls.length && maiusc(ls[i + 1]) && t.length < 160) { i++; t += ' ' + ls[i]; }
      fecha(); n = +m[1]; continue;
    }
    if (n) buf.push(l);
  }
  fecha();
  const out = {};
  Object.entries(sec).forEach(([k, linhas]) => {
    let txt = ''; linhas.filter(l => !LIXO_BULA.test(l) && !(emp && emp.test(l))).forEach(l => {
      if (!txt) txt = l;
      else if (/^[-•–]\s|^[a-z]\)\s/.test(l) || /[.:;!?]$/.test(txt)) txt += '\n' + l;
      else txt += (txt.endsWith('-') ? '' : ' ') + l;
    });
    if (txt.trim()) out[k] = txt.trim();
  });
  return out;
}

/* ---------- arquivos ---------- */
const arq = r => path.join(PASTA, r + '.json');
const tem = r => fs.existsSync(arq(r));
function salvar(b) { fs.writeFileSync(arq(b.registro), JSON.stringify(b)); }
/* as bulas que já estão no app (pacotes de www/bulas, ou o www/bulas.json antigo) entram na pasta de trabalho */
function migrar() {
  let n = 0; const pega = b => { if (b && b.registro && !tem(b.registro)) { const c = Object.assign({}, b); delete c.principio; salvar(c); n++; } };
  const velho = path.join(WWW, 'bulas.json');
  if (fs.existsSync(velho)) { Object.values(JSON.parse(fs.readFileSync(velho, 'utf8'))).forEach(pega); fs.unlinkSync(velho); }
  if (fs.existsSync(SAIDA)) for (const f of fs.readdirSync(SAIDA)) {
    if (/^b\d+\.json$/.test(f)) Object.values(JSON.parse(fs.readFileSync(path.join(SAIDA, f), 'utf8'))).forEach(pega);
    else if (/^\d{9}\.json$/.test(f)) pega(JSON.parse(fs.readFileSync(path.join(SAIDA, f), 'utf8')));
  }
  return n;
}
/* monta os pacotes e o índice pequeno que o app carrega: registro → [chave, data, pacote]; chave → registro */
function indice(chaveDe) {
  fs.mkdirSync(SAIDA, { recursive: true });
  for (const f of fs.readdirSync(SAIDA)) if (/^(b\d+|\d{9})\.json$/.test(f)) fs.unlinkSync(path.join(SAIDA, f));
  const r = {}, s = {}, pacotes = [];
  const regs = fs.readdirSync(PASTA).filter(f => /^\d{9}\.json$/.test(f)).map(f => f.slice(0, 9)).sort();
  for (const x of regs) {
    let b; try { b = JSON.parse(fs.readFileSync(arq(x), 'utf8')); } catch (e) { continue; }
    if (!pacotes.length || Object.keys(pacotes[pacotes.length - 1]).length >= POR_PACOTE) pacotes.push({});
    const np = pacotes.length - 1; pacotes[np][x] = b;
    const k = chaveDe[x] || ''; r[x] = [k, b.data || '', np];
    if (k && (!s[k] || (b.data || '') > (r[s[k]][1] || ''))) s[k] = x;   /* para a mesma substância, a bula mais nova */
  }
  pacotes.forEach((p, i) => fs.writeFileSync(path.join(SAIDA, 'b' + String(i).padStart(2, '0') + '.json'), JSON.stringify(p)));
  fs.writeFileSync(path.join(SAIDA, 'indice.json'), JSON.stringify({ v: 2, feito: new Date().toISOString().slice(0, 10), r, s }));
  return Object.keys(r).length;
}

/* ---------- plano B: o próprio navegador baixa (passa pela proteção contra robôs do site) ---------- */
function paraNavegador(alvo, total) {
  const falta = alvo.filter(p => !p.regs.some(tem)).map(p => [p.k.replace('|', ' · '), p.regs.slice(0, 3)]);
  const cob = alvo.reduce((s, p) => s + p.n, 0);
  const codigo = `/* BULA · baixa as bulas do paciente no próprio site da Anvisa (${falta.length} remédios). Cole no Console de consultas.anvisa.gov.br */
(async () => {
const L = ${JSON.stringify(falta)};
const A = '/api/consulta', H = { Authorization: 'Guest', Accept: 'application/json, text/plain, */*' };
const dorme = ms => new Promise(r => setTimeout(r, ms));
async function pede(u, pdf) {
  const r = await fetch(A + u, { headers: H, credentials: 'include' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (!pdf) return r.json();
  const b = new Uint8Array(await r.arrayBuffer()); let s = '';
  for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
  return btoa(s);
}
let lote = {}, n = 0, ok = 0, falhou = 0, bloq = 0;
function salva() {
  if (!Object.keys(lote).length) return; n++;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(lote)], { type: 'application/json' }));
  a.download = 'bulas-lote-' + String(n).padStart(3, '0') + '-' + Date.now() + '.json';
  document.body.appendChild(a); a.click(); a.remove(); lote = {};
}
console.log('%cBULA: baixando ' + L.length + ' bulas. Deixe esta aba aberta.', 'font-size:16px;font-weight:bold');
for (let i = 0; i < L.length; i++) {
  const [nome, regs] = L[i]; let feito = false;
  for (const r of regs) {
    try {
      const busca = await pede('/bulario?count=10&page=1&filter%5BnumeroRegistro%5D=' + r);
      const p = (busca.content || [])[0]; if (!p) continue; await dorme(700);
      const h = await pede('/bulario/' + p.idProduto + '?count=5');
      const v = (((h.historico || {}).content) || []).filter(x => x.idBulaPaciente || x.idBulaPacienteProtegido)
        .sort((a, b) => String(b.dataPublicacao).localeCompare(String(a.dataPublicacao)))[0];
      if (!v) continue; await dorme(700);
      const pdf = await pede('/medicamentos/arquivo/bula/parecer/' + (v.idBulaPaciente || v.idBulaPacienteProtegido) + '/?Authorization=', true);
      lote[r] = { produto: p.nomeProduto || '', razaoSocial: p.razaoSocial || '', data: String(v.dataPublicacao || p.data || '').slice(0, 10), pdf };
      feito = true; ok++; bloq = 0; break;
    } catch (e) { console.warn(r, e.message); if (/HTTP 40[13]/.test(e.message)) bloq++; await dorme(2000); }
  }
  if (!feito) falhou++;
  console.log('[' + (i + 1) + '/' + L.length + '] ' + (feito ? 'ok   ' : 'falhou ') + nome);
  if (Object.keys(lote).length >= 25) salva();
  if (bloq >= 6) { console.error('O site parou de responder. Recarregue a página (F5) e cole de novo: continua de onde parou depois de rodar --lotes.'); break; }
  await dorme(700);
}
salva();
console.log('%cBULA: pronto. ' + ok + ' bulas baixadas, ' + falhou + ' falharam. Agora rode no computador: node scripts/bulas/baixar-bulas.js --lotes <pasta Downloads>', 'font-size:16px;font-weight:bold');
})();
`;
  const saida = path.join(__dirname, 'no-navegador.txt');
  fs.writeFileSync(saida, codigo);
  console.log(`Criei ${saida}`);
  console.log(`São ${falta.length} remédios ainda sem bula (os ${alvo.length} da lista cobrem ${Math.round(cob / total * 100)}% das caixas).\n`);
  console.log('1. Abra no Chrome: https://consultas.anvisa.gov.br/#/bulario/  e espere a página carregar.');
  console.log('2. Aperte F12 e clique na aba Console. Se pedir, digite: allow pasting  e Enter.');
  console.log('3. Abra o no-navegador.txt no Bloco de Notas, Ctrl+A, Ctrl+C, cole no Console e aperte Enter.');
  console.log('4. Quando o Chrome perguntar sobre vários downloads, clique em Permitir. Deixe a aba aberta até aparecer "pronto".');
  console.log('5. Depois: node scripts/bulas/baixar-bulas.js --lotes "PASTA_DOS_DOWNLOADS"');
}
async function lerLotes(pasta, chaveDe) {
  if (!pasta) pasta = path.join(require('os').homedir(), 'Downloads');
  const arqs = fs.readdirSync(pasta).filter(f => /^bulas-lote-.*\.json$/i.test(f)).sort();
  if (!arqs.length) { console.log('Não achei arquivos bulas-lote-*.json em', pasta); return; }
  carregarPdfjs();
  let novas = 0, ruins = [];
  for (const f of arqs) {
    let lote; try { lote = JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8')); } catch (e) { console.log('Arquivo com problema (baixou pela metade?):', f); continue; }
    for (const [r, x] of Object.entries(lote)) {
      if (tem(r)) continue;
      try {
        const secoes = await extrairSecoes(new Uint8Array(Buffer.from(x.pdf, 'base64')), x.razaoSocial || '');
        if (Object.keys(secoes).length < 6) { ruins.push(r + '\tnao-leu'); continue; }
        salvar({ registro: r, produto: x.produto || '', data: x.data || '', fonte: 'Bula do paciente oficial (Bulário Eletrônico da Anvisa)', secoes }); novas++;
      } catch (e) { ruins.push(r + '\t' + e.message); }
    }
    console.log(`${f}: ok`);
  }
  const n = indice(chaveDe);
  if (ruins.length) fs.writeFileSync(path.join(__dirname, 'falhas.txt'), ruins.join('\n') + '\n');
  const kb = fs.readdirSync(SAIDA).reduce((s, f) => s + fs.statSync(path.join(SAIDA, f)).size, 0) / 1024;
  console.log(`\nPronto. ${novas} bulas novas${ruins.length ? `, ${ruins.length} PDFs que não deu para ler (scripts/bulas/falhas.txt)` : ''}.`);
  console.log(`Agora são ${n} bulas dentro do app (${Math.round(kb / 1024)} MB na pasta www/bulas).`);
  console.log('Suba no GitHub os arquivos da pasta www/bulas. Os bulas-lote-*.json da pasta Downloads podem ser apagados depois.');
}

async function main() {
  fs.mkdirSync(PASTA, { recursive: true });
  const migradas = migrar(); if (migradas) console.log(`${migradas} bulas que já estavam no app entraram na lista.`);
  const { lista, chaveDe, total } = escolher();
  if (process.argv.includes('--so-indice')) { console.log(indice(chaveDe), 'bulas no índice.'); return; }
  if (process.argv.includes('--navegador')) return paraNavegador(lista.slice(0, MAX), total);
  if (process.argv.includes('--lotes')) return lerLotes(arg('--lotes'), chaveDe);
  carregarPdfjs();
  if (process.argv.includes('--teste')) {
    const r = arg('--teste') && /^\d{9}$/.test(arg('--teste')) ? arg('--teste') : '100430911';
    console.log('Testando um registro:', r);
    try { const b = await baixar(r); console.log('Deu certo:', b.produto, '·', Object.keys(b.secoes).length, 'perguntas da bula lidas.'); }
    catch (e) { console.log('Não deu:', e.message); console.log('Detalhe:', ultimoErro || '-'); if (e.message === 'bloqueado') console.log('\nO site bloqueia robôs. Use o navegador:  node scripts/bulas/baixar-bulas.js --navegador'); }
    return;
  }
  const alvo = lista.slice(0, MAX);
  const cob = alvo.reduce((s, p) => s + p.n, 0);
  console.log(`Vou garantir a bula de ${alvo.length} remédios (substância + tipo), que cobrem ${Math.round(cob / total * 100)}% das caixas da lista CMED (sem injetáveis e uso hospitalar).`);
  console.log('Pode parar com Ctrl+C e rodar de novo depois: continua de onde parou.\n');
  const falhas = []; let novas = 0, ja = 0, feitos = 0, bloqueios = 0;
  let parar = false; process.on('SIGINT', () => { if (parar) process.exit(1); parar = true; console.log('\nParando depois desta bula...'); });
  for (const p of alvo) {
    if (parar) break;
    feitos++;
    if (p.regs.some(tem)) { ja++; continue; }
    let ok = false, erro = '';
    for (const r of p.regs.slice(0, 3)) {
      try {
        const b = await baixar(r); salvar(b); novas++; ok = true;
        console.log(`[${feitos}/${alvo.length}] ok   ${p.k.replace('|', ' · ')} (${r})`);
        break;
      } catch (e) { erro = e.message; if (e.message === 'bloqueado') break; await dorme(ESPERA); }
    }
    bloqueios = erro === 'bloqueado' && !ok ? bloqueios + 1 : 0;
    if (bloqueios >= 3) {
      console.log('\nA Anvisa está recusando os pedidos deste computador (bloqueio do site, não é falta de internet).');
      console.log('Detalhe:', ultimoErro);
      console.log('Use o navegador:  node scripts/bulas/baixar-bulas.js --navegador   (o que já baixou continua guardado).');
      break;
    }
    if (!ok) { falhas.push(`${p.k}\t${p.regs.slice(0, 3).join(',')}\t${erro}`); console.log(`[${feitos}/${alvo.length}] falhou ${p.k.replace('|', ' · ')} (${erro})`); }
    if (novas && novas % 25 === 0) indice(chaveDe);
    await dorme(ESPERA);
  }
  const n = indice(chaveDe);
  fs.writeFileSync(path.join(__dirname, 'falhas.txt'), falhas.join('\n') + (falhas.length ? '\n' : ''));
  const kb = fs.readdirSync(SAIDA).reduce((s, f) => s + fs.statSync(path.join(SAIDA, f)).size, 0) / 1024;
  console.log(`\nPronto. ${novas} bulas novas, ${ja} já estavam, ${falhas.length} falharam (scripts/bulas/falhas.txt).`);
  console.log(`Agora são ${n} bulas dentro do app (${Math.round(kb / 1024)} MB na pasta www/bulas).`);
  console.log('Agora suba no GitHub os arquivos da pasta www/bulas (são poucos) e apague o www/bulas.json antigo, se ainda estiver lá.');
}
main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
