# Remédio Falado

App Android para idosos com baixa visão ou pouca leitura. A pessoa aponta o celular para a caixa do remédio e o app fala o que é, para que serve e como tomar. Também lembra o horário com alarme, confirma pela câmera se a caixa é a certa e mostra o que a família recebe.

## O que o app faz

- **Que remédio é este?** Lê o código de barras da caixa (foto ou câmera ao vivo) e consulta a lista oficial de preços da CMED/Anvisa, com mais de 27 mil códigos, sem precisar de internet.
- **Explicação em voz alta**, em português simples. Todo remédio da lista ganha uma frase geral de "para que serve", a partir da classe terapêutica da Anvisa (`scripts/grupos.py`, revisável). Os 10 de pressão e diabetes têm texto completo: losartana, captopril, enalapril, hidroclorotiazida, atenolol, propranolol, anlodipino, espironolactona, metformina e glibenclamida.
- **Ler e colocar na agenda:** depois de ler a caixa, o botão "Colocar na minha agenda" mostra 3 passos numerados: horários, quanto tomar em cada horário (ex.: 1 comprimido de manhã e 2 no jantar) e "Conferi com a receita". A pessoa copia da receita do médico; o app não sugere dose.
- **Total do dia e aviso de dose:** o app soma o que foi marcado ("4 comprimidos de 500 mg = 2.000 mg por dia. Está igual à receita?"). Nos 10 remédios com texto próprio, se o total passar da maior dose por dia citada na bula, aparece um aviso pedindo para conferir a receita e, na dúvida, perguntar ao farmacêutico. O aviso não bloqueia (o médico pode receitar diferente) e só pede uma confirmação a mais. Os limites estão em `MAXDIA` no `www/index.html`, com as bulas usadas como fonte.
- **Bula completa:** botão para ler o QR code da caixa, que abre a bula digital oficial (Lei 14.338/2022), mostrando antes qual site vai abrir; e link para a bula no Bulário Eletrônico da Anvisa.
- **Foto da caixa (opcional):** dá para tirar uma foto da caixa no cadastro ou depois, na Agenda. A foto aparece na tela Hoje, no alarme e na agenda, e fica guardada só no celular.
- **Boas-vindas:** no primeiro uso, o app pergunta o nome e quem da família recebe os avisos. A opção "Ver demonstração" abre com dados de exemplo.
- **Agenda e alarme:** o familiar cadastra os horários e o Android avisa na hora, mesmo com o app fechado. A pessoa aperta TOMEI.
- **Conferir caixa:** na hora da dose, a câmera confirma se é o remédio certo.
- **Onde pegar de graça:** botão "Farmácias perto de mim", que abre o mapa com as farmácias da Farmácia Popular mais próximas. Também mostra quais remédios da pessoa são gratuitos na Farmácia Popular, o que levar, as 52 farmácias credenciadas do Recife por bairro (com mapa) e uma frase pronta para ligar antes de ir.
- **Posto de saúde (SUS):** na aba Grátis, a opção "Posto de saúde (SUS)" lista 143 unidades da Prefeitura do Recife com endereço, horário, telefone, distância e se o posto tinha os remédios da pessoa na última lista de estoque publicada. Dados abertos da Secretaria de Saúde do Recife ("Medicamentos por unidade de saúde" e "Rede de atenção à saúde no Recife"), convertidos por `scripts/postos.py` em `www/postos.json`.
- **Para o alarme tocar sempre:** celulares como Xiaomi, Redmi, Huawei, Oppo, Vivo e Samsung fecham apps em segundo plano. O app detecta o que falta (notificações, alarme exato, economia de bateria, início automático), mostra um aviso na tela Hoje e uma tela com passos e botões que abrem a configuração certa de cada marca, mais um teste com o app fechado. Usa um plugin Android próprio (`android-src/EnergiaPlugin.java`), copiado para o projeto por `scripts/patch-android.js`.
- **Farmácias mais perto:** com as coordenadas das farmácias (veja `scripts/coordenadas.py`), o app ordena a lista pela distância usando o GPS do celular. A localização não sai do aparelho.
- **Toque para ouvir:** tocar num remédio da lista ou da agenda fala de novo para que serve.
- **Família e WhatsApp:** depois do TOMEI, o app oferece avisar o familiar no WhatsApp com a mensagem pronta. A tela Família mostra confirmações, alertas e resumo semanal, cada um com botão para enviar no WhatsApp.

## Acessibilidade e leitura

- Letra Atkinson Hyperlegible, feita para pessoas com baixa visão, com base de 19 px.
- Botão "AA" no topo e opção em Agenda → Aparência: letra Normal, Grande ou Muito grande (até 130%).
- Modo de contraste alto (preto no branco, bordas grossas).
- Rótulos sem caixa-alta, texto secundário escuro e botões de pelo menos 64 px.
- Tudo o que aparece na tela também pode ser ouvido.
- **Cores com significado fixo:** amarelo = ação principal (ler o remédio), azul-marinho = navegar e confirmar, verde = tomei / está certo, laranja = atrasado, vermelho = remédio errado. Cada remédio tem uma cor e a inicial dentro da bolinha, para não depender só da cor (daltonismo).
- **Modo calmo** (Agenda → Aparência ou na tela de boas-vindas): para pessoas autistas ou sensíveis a estímulos. Sem animações, uma cor de destaque só, alarme sem voz automática (a voz fala apenas ao tocar em "Ouvir") e mensagem de "Pronto" escrita na tela ao final de cada ação.
- O app escolhe sozinho a voz em português mais natural do celular. Em Agenda → Aparência dá para ouvir e trocar a voz e a velocidade da fala (Devagar, Normal, Rápida).

## Tecnologias

HTML, CSS e JavaScript, empacotados como app Android com [Capacitor](https://capacitorjs.com). Leitura de código de barras com ML Kit (no celular) e ZXing (na web), foto da caixa com a câmera do Capacitor, voz com o motor de texto em fala do Android e alarmes com notificações locais. O APK é gerado pelo GitHub Actions a cada envio para a branch `main`.

## Estrutura

```
www/index.html        app (telas, leitura, voz, agenda)
www/base.json         lista CMED/Anvisa compactada (23/09/2026)
www/farmacias.json    farmácias credenciadas da Farmácia Popular no Recife
www/postos.json       postos de saúde do Recife e remédios em estoque (dados abertos)
android-src/          plugin Android próprio (bateria e início automático)
scripts/              cópia de bibliotecas, ajustes do Android e conversão dos dados
.github/workflows/    geração automática do APK
```

## Avisos

O Remédio Falado é um **lembrete**: não indica nem muda dose. Ao colocar um remédio na agenda, a pessoa copia a quantidade e os horários da receita do médico e confirma que conferiu. Nada vem marcado por padrão.

**Privacidade e termos:** tela dentro do app (rodapé, boas-vindas e Agenda → Configurações) e a mesma página em `www/privacidade.html`, pronta para virar o link de política de privacidade exigido pela Google Play. Os dados ficam só no celular; não há servidor, cadastro ou propaganda (LGPD, Lei 13.709/2018).

Protótipo acadêmico. Os textos simplificados ainda precisam de revisão de farmacêutico. O app não muda dose e não substitui o médico. Os códigos de barras vêm da lista de preços CMED/Anvisa, que pode conter erros e é atualizada todo mês.

## Licença

Todos os direitos reservados. Veja o arquivo `LICENSE`.

## Autor

Criado pelo Squad 4 · CESAR School (Recife) · 2026.
