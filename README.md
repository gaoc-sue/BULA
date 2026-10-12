# Remédio Falado

App Android para idosos com baixa visão ou pouca leitura. A pessoa aponta o celular para a caixa do remédio e o app fala o que é, para que serve e como tomar. Também lembra o horário com alarme, confirma pela câmera se a caixa é a certa e mostra o que a família recebe.

## O que o app faz

- **Que remédio é este?** Lê o código de barras da caixa (foto ou câmera ao vivo) e consulta a lista oficial de preços da CMED/Anvisa, com mais de 27 mil códigos, sem precisar de internet.
- **Explicação em voz alta**, em português simples. Todo remédio da lista ganha uma frase geral de "para que serve", a partir da classe terapêutica da Anvisa (`scripts/grupos.py`, revisável). Os 10 de pressão e diabetes têm texto completo: losartana, captopril, enalapril, hidroclorotiazida, atenolol, propranolol, anlodipino, espironolactona, metformina e glibenclamida.
- **Ler e colocar na agenda:** depois de ler a caixa, o botão "Colocar na minha agenda" pede só quanto tomar e os horários (Manhã, Almoço, Noite), com botões grandes e sem digitação.
- **Boas-vindas:** no primeiro uso, o app pergunta o nome e quem da família recebe os avisos. A opção "Ver demonstração" abre com dados de exemplo.
- **Agenda e alarme:** o familiar cadastra os horários e o Android avisa na hora, mesmo com o app fechado. A pessoa aperta TOMEI.
- **Conferir caixa:** na hora da dose, a câmera confirma se é o remédio certo.
- **Onde pegar de graça:** botão "Farmácias perto de mim", que abre o mapa com as farmácias da Farmácia Popular mais próximas. Também mostra quais remédios da pessoa são gratuitos na Farmácia Popular, o que levar, as 52 farmácias credenciadas do Recife por bairro (com mapa) e uma frase pronta para ligar antes de ir.
- **Toque para ouvir:** tocar num remédio da lista ou da agenda fala de novo para que serve.
- **Família e WhatsApp:** depois do TOMEI, o app oferece avisar o familiar no WhatsApp com a mensagem pronta. A tela Família mostra confirmações, alertas e resumo semanal, cada um com botão para enviar no WhatsApp.

## Tecnologias

HTML, CSS e JavaScript, empacotados como app Android com [Capacitor](https://capacitorjs.com). Leitura de código de barras com ZXing, voz com o motor de texto em fala do Android e alarmes com notificações locais. O APK é gerado pelo GitHub Actions a cada envio para a branch `main`.

## Estrutura

```
www/index.html        app (telas, leitura, voz, agenda)
www/base.json         lista CMED/Anvisa compactada (23/09/2026)
www/farmacias.json    farmácias credenciadas da Farmácia Popular no Recife
scripts/              cópia de bibliotecas e ajustes do Android
.github/workflows/    geração automática do APK
```

## Avisos

O Remédio Falado é um **lembrete**: não indica nem muda dose. Ao colocar um remédio na agenda, a pessoa copia a quantidade e os horários da receita do médico e confirma que conferiu. Nada vem marcado por padrão.

Protótipo acadêmico. Os textos simplificados ainda precisam de revisão de farmacêutico. O app não muda dose e não substitui o médico. Os códigos de barras vêm da lista de preços CMED/Anvisa, que pode conter erros e é atualizada todo mês.

## Licença

Todos os direitos reservados. Veja o arquivo `LICENSE`.

## Autor

Criado por Gaoc · Squad 4 · CESAR School (Recife) · 2026.
