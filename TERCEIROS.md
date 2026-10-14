# Componentes e dados de terceiros

- **pdf.js** 2.16.105 (Mozilla), licença Apache 2.0: leitura do PDF da bula.
- **ZXing** (@zxing/library), licença Apache 2.0: leitura de código de barras no navegador e desenho do QR code da conexão com a família.
- **Atkinson Hyperlegible** (Braille Institute), licença SIL Open Font.
- **Textos das bulas em `www/bulas.json`**: bulas do paciente oficiais do Bulário Eletrônico da Anvisa,
  extraídas com o projeto buladiff — Copyright (c) 2026 Vitor, licença MIT
  (https://github.com/vasfvitor/buladiff). Os dados do fabricante foram retirados.
- **Lista de preços CMED/Anvisa**: dados públicos.
- **Estoque e rede de saúde do Recife** (Portal de Dados Abertos da Prefeitura do Recife): Open Database License (ODbL) 1.0. O arquivo derivado (`estoque.json` / `www/postos.json`) é publicado sob a mesma licença no repositório `remedio-falado-dados`.
- **ntfy** (servidor de passagem da conexão com a família): serviço público ntfy.sh, software de código aberto (Apache 2.0 / GPLv2). O app não inclui código do ntfy; só envia mensagens já criptografadas de ponta a ponta. Pode ser trocado por um servidor próprio.
- **@capacitor-community/speech-recognition** 7.0.1, licença MIT: reconhecimento de voz do Android para o botão Falar.
- **Google ML Kit Text Recognition** (`com.google.mlkit:text-recognition` 16.0.1), Termos do ML Kit (https://developers.google.com/ml-kit/terms): leitura do texto da foto da receita no próprio celular. O modelo vem dentro do app; a foto não é enviada ao Google.
