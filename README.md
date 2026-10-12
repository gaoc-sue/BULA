# Remédio Falado

App Android para idosos com baixa visão ou pouca leitura. A pessoa aponta o celular para a caixa do remédio e o app fala o que é, para que serve e como tomar. Também lembra o horário com alarme, confirma pela câmera se a caixa é a certa e mostra o que a família recebe.

## Design baseado em estudos

O app funciona como uma **caixinha de remédios** digital: a tela Hoje mostra os momentos do dia (café da manhã, almoço, tarde, jantar, antes de dormir), cada um com seus remédios e um único botão "Tomei os do almoço".

| Decisão | Por quê |
|---|---|
| Doses amarradas a momentos da rotina, não só a horários | Pistas de rotina dão horários mais regulares e ajudam a formar o hábito (Valenzuela-Beltrán et al., 2022, *Healthcare*; van de Vijver et al., 2023, *Frontiers in Psychology*) |
| Cadastro com uma pergunta por tela, barra de progresso e "Voltar" escrito | Idosos se perderam em apps de remédio com menus e submenus e não entenderam "+" e "cancelar" (Grindrod et al., 2014, *JMIR mHealth*) |
| Botões principais de 88 px e demais de 72 px (~14 mm e ~11 mm) | Alvos de ~14 mm tiveram o melhor desempenho com idosos (Leitão e Silva, 2012) |
| Fundo claro liso, texto preto, destaque roxo escuro (#4B2A7B, contraste 11:1), verde só para "tomado"; aquarela só na abertura, no topo da tela Hoje e no "Pronto!", nunca atrás de texto | O NIA/NLM recomenda evitar azul, amarelo e verde lado a lado e usar texto escuro em fundo claro; contraste de texto ≥ 4,5:1 e de bordas ≥ 3:1 (WCAG 2.2) |
| Ícone + texto + voz em tudo, estado escrito (não só pela cor) | 51% dos brasileiros de 50 a 64 anos são analfabetos funcionais (Inaf 2024) |
| Tela "Pronto!" depois do Tomei (desligada no modo calmo) | Reforço positivo logo após a ação ajuda a formar o hábito (Valenzuela-Beltrán et al., 2022) |
| "Semana de…" para a família, com resumo pronto para o WhatsApp | Medir e devolver o padrão de doses é uma das recomendações de Valenzuela-Beltrán et al. (2022) |

## O que o app faz

- **Que remédio é este?** Lê o código de barras da caixa (foto ou câmera ao vivo) e consulta a lista oficial de preços da CMED/Anvisa, com mais de 27 mil códigos, sem precisar de internet.
- **Explicação em voz alta**, em português simples. Todo remédio da lista ganha uma frase geral de "para que serve", a partir da classe terapêutica da Anvisa (`scripts/grupos.py`, revisável). Os 10 de pressão e diabetes têm texto completo: losartana, captopril, enalapril, hidroclorotiazida, atenolol, propranolol, anlodipino, espironolactona, metformina e glibenclamida.
- **Ler e colocar na agenda:** depois de ler a caixa, 4 perguntas, uma por tela: em que momento a receita manda tomar (café, almoço, jantar, dormir ou outro horário), quanto em cada momento, conferir com a receita (com total do dia) e foto da caixa (opcional). A pessoa copia da receita do médico; o app não sugere dose.
- **Horários da rotina:** em Agenda, a pessoa muda a hora do café, almoço, jantar e de dormir, e os lembretes mudam juntos.
- **Total do dia e aviso de dose:** o app soma o que foi marcado ("4 comprimidos de 500 mg = 2.000 mg por dia. Está igual à receita?"). Nos 10 remédios com texto próprio, se o total passar da maior dose por dia citada na bula, aparece um aviso pedindo para conferir a receita e, na dúvida, perguntar ao farmacêutico. O aviso não bloqueia (o médico pode receitar diferente) e só pede uma confirmação a mais. Os limites estão em `MAXDIA` no `www/index.html`, com as bulas usadas como fonte.
- **Bula completa:** a bula do paciente oficial inteira, dividida nas 9 perguntas da bula, com letra grande e o botão "Ouvir esta parte". Funciona sem internet. 69 bulas já vêm no app (`www/bulas.json`, entre elas losartana, metformina e anlodipino). Para as outras, o app instalado baixa a bula oficial do Bulário Eletrônico da Anvisa pelo número de registro, extrai o texto do PDF (pdf.js), tira os dados do fabricante e guarda no celular; a cada 30 dias confere se saiu versão nova. Se não der, abre pelo QR code da caixa (Lei 14.338/2022) ou pelo site da Anvisa.
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

## Créditos de dados

- Lista de preços CMED/Anvisa (códigos de barras) e Bulário Eletrônico da Anvisa.
- Textos das bulas incluídas: extraídos pelo projeto [buladiff](https://github.com/vasfvitor/buladiff) (licença MIT) a partir do Bulário Eletrônico da Anvisa; o script `scripts/bulas_seed.py` monta o `www/bulas.json`.
- A busca de bulas usa a API interna do Bulário (a mesma do site), que não é documentada e pode mudar.
- Postos de saúde: dados abertos da Prefeitura do Recife.

## Licença

Todos os direitos reservados. Veja o arquivo `LICENSE`.

## Autor

Criado pelo Squad 4 · CESAR School (Recife) · 2026.
