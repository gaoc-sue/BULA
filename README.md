# Remédio Falado

App Android para idosos com baixa visão ou pouca leitura. A pessoa aponta o celular para a caixa do remédio e o app fala o que é e para que serve, segundo a bula. Ele lembra o horário com alarme, confere pela câmera se a caixa é a certa e, se a pessoa quiser, conecta o celular de alguém da família, com criptografia de ponta a ponta.

## Design baseado em estudos

A tela inicial mostra **só o momento de agora** (café da manhã, almoço, tarde, jantar ou antes de dormir), com os remédios e um botão grande **TOMEI**. O resto do dia fica num card "Depois", e embaixo há 4 atalhos grandes: Ler a caixa, Meus remédios, Remédio de graça e Família. As outras telas têm "Voltar" escrito e o botão "Ouvir".

| Decisão | Por quê |
|---|---|
| Só a próxima ação em destaque; o secundário fica em "Mais informações" e em Ajustes | Simplificar e destacar o próximo botão esperado (Gomez-Hernandez et al., 2023, *JMIR mHealth*, revisão de 40 estudos com pessoas de 60+) |
| "Voltar" escrito e "Ouvir" no topo de toda tela; sem barra de abas para quem toma o remédio | Saída segura em toda tela e navegação em linha (Gomez-Hernandez et al., 2023; Grindrod et al., 2014, *JMIR mHealth*) |
| Ícone + nome em todo botão | O acerto de idosos subiu de 45% (só ícone) para 78% (ícone + nome) (Leung, McGrenere e Graf, 2011, *Behaviour & IT*) |
| Desenhos concretos: xícara, prato, tigela, lua; foto da caixa; quantidade em desenho (1 comprimido = 1 desenho) | Imagens concretas e familiares (Gomez-Hernandez et al., 2023); pictograma de refeição entendido por 95,5% (Alves et al., 2025, *RBPS*); quantidade por pictogramas repetidos (Dick, 2025) |
| Remédio lido: nome + 3 opções numeradas (1 Ouvir, 2 Colocar nos meus remédios, 3 Ler a bula) | Poucas opções por tela (Apple, *Assistive Access*, WWDC 2025); números ajudam quem dá ajuda por telefone (CPqD Alcance) |
| Tela "Pronto!" que só fecha com um toque | Sem tempo-limite e retorno claro depois de cada ação (Apple, WWDC 2025; Gomez-Hernandez et al., 2023) |
| Doses amarradas a momentos da rotina | Pistas de rotina dão horários mais regulares (Valenzuela-Beltrán et al., 2022; van de Vijver et al., 2023) |
| Cadastro com uma pergunta por tela | Idosos se perderam em menus e submenus (Grindrod et al., 2014) |
| Botões de 64 a 104 px (TOMEI) | Alvos de ~14 mm tiveram o melhor desempenho com idosos (Leitão e Silva, 2012) |
| Paleta petróleo (#0F4C5C) + mel (#F2A33A) em fundo creme liso, texto escuro; verde só para "tomado" | NIA/NLM (texto escuro em fundo claro, sem textura atrás do texto) e WCAG 2.2 (contraste ≥ 4,5:1) |
| Cor + símbolo fixo em cada botão: laranja com ✓ = seguir; azul com alto-falante/microfone = ouvir e falar; branco = voltar; vermelho com alerta = socorro. A voz diz a cor e o símbolo | A voz consegue apontar o botão ("toque no botão laranja, com o sinal de certo"). O símbolo garante a leitura para daltônicos: conferido com simulação de deuteranopia, protanopia e tritanopia (Machado et al., 2009) |
| Ajustes ficam "para o familiar" | No modo simplificado da Apple, quem configura é a pessoa de apoio |
| Frases curtas, ordem direta, palavras comuns | Lei 15.263/2025 (Política Nacional de Linguagem Simples), art. 5º |
| Usar o app inteiro falando e ouvindo, sem precisar ler nem escrever | 51% dos brasileiros de 50 a 64 anos são analfabetos funcionais (Inaf 2024) |

Teste sugerido antes da banca: 5 a 8 idosos, "o que acontece se tocar aqui?" em cada botão, com meta de 85% de acerto (critério ISO 3864-1 usado por Alves et al., 2025).

## O que o app faz

- **Que remédio é este?** Lê o código de barras da caixa e consulta a lista oficial de preços da CMED/Anvisa, com mais de 27 mil códigos, sem internet. Fala o tipo de remédio e, quando há bula, o trecho literal de "para que serve".
- **Colocar nos meus remédios:** 4 perguntas, uma por tela: em que momento a receita manda tomar, quanto em cada momento, conferir com a receita (com o total do dia) e foto da caixa (opcional). A pessoa copia da receita do médico; o app não sugere dose. Quantidade diferente de 1, 2 ou meio se escolhe com os botões − e + (sem digitar); "Escrever" fica para receita fora do padrão.
- **Total do dia e aviso de dose:** soma o que foi marcado. Nos 10 remédios com texto próprio, se o total passar da maior dose por dia citada na bula, aparece um aviso pedindo para conferir a receita. Não bloqueia.
- **Bula completa:** a bula do paciente oficial, nas 9 perguntas, com letra grande e "Ouvir esta parte". 69 bulas já vêm no app (`www/bulas.json`); as outras são baixadas do Bulário Eletrônico da Anvisa e ficam guardadas.
- **Alarme:** o Android avisa na hora, mesmo com o app fechado. A pessoa aperta TOMEI. "Conferir a caixa" confirma pela câmera se é o remédio certo.
- **Para o alarme tocar sempre:** detecta o que falta em cada marca (Xiaomi, Samsung, Motorola...) e abre a configuração certa (`android-src/EnergiaPlugin.java`).
- **Remédio de graça:** Farmácia Popular (52 farmácias do Recife) e 143 postos de saúde do SUS com endereço, horário, telefone e estoque (dados abertos da Prefeitura).
- **Família, com o celular conectado:** em Família → "Conectar o celular da família", o app mostra um código de 6 números e um QR code. No celular da família, a pessoa toca em "Sou da família" e lê o código. Quem toma o remédio vê o nome e toca em Aceitar. A partir daí, a família vê:
  - o dia de hoje, com "Ligar para ela" e "Lembrar no celular dela";
  - a semana em grade;
  - os remédios;
  - um bloco "Vale olhar", com caixa errada e alarme que pode falhar.

  Se uma dose passar 30 minutos sem ser marcada, a família recebe uma notificação sozinha, mesmo com os dois apps fechados. Isso roda numa tarefa do Android (JobScheduler) a cada 15 minutos; com o celular parado, o Android pode atrasar o aviso.
- **Modo gestor (alguém capaz cuida dos remédios):** ao conectar, a pessoa da família escolhe "Acompanhar e cuidar dos remédios" (filho, mãe, cuidadora, farmacêutica). Quem toma o remédio vê o pedido e escolhe: aceitar, aceitar só para acompanhar ou não aceitar. Depois:
  - o gestor lê a caixa no celular dele, responde as 4 perguntas copiando da receita, e a mudança vai criptografada para o celular de quem toma;
  - o celular de quem toma aplica a mudança, refaz os alarmes, **fala o que mudou** e anota com o nome de quem mudou ("Últimas mudanças");
  - quem toma fica no modo simples: vê e ouve os remédios, recebe os alarmes e marca TOMEI. Ao ler uma caixa nova, toca em "Pedir para X colocar";
  - o gestor também muda horário e quantidade, ou tira um remédio (com dois toques). Se o celular de quem toma demorar a abrir o app, a mudança fica "Esperando" e é reenviada de 6 em 6 horas pelo próprio Android (`Elo.java`), mesmo com o app do gestor fechado, até o outro celular confirmar;
  - quem toma desliga quando quiser: Ajustes → Quem cuida dos meus remédios → "Parar: eu mesmo cuido".

  Base: Apple Assistive Access (a pessoa de apoio configura, quem usa vê menos opções), com uma adaptação nossa: a pessoa que toma o remédio aceita e pode desligar, e toda mudança é falada (Agency e Responsibility).
- **Falar com o app (para quem não lê):** o botão **Falar** fica em toda tela. A pessoa diz:
  - "já tomei";
  - "qual remédio agora?";
  - "que remédio é esse?";
  - "liga pra minha filha";
  - "meus remédios";
  - "remédio de graça";
  - "o que mudou" (no modo gestor);
  - "socorro".

  O app responde em voz e **confirma antes de agir** ("Vou marcar os remédios do almoço. Diga sim ou não"). Se não entender, mostra 6 botões grandes com desenho.
- **Cadastro respondendo falando:** no "Colocar nos meus remédios", o botão "Responder falando" pergunta e ouve: em que momento ("de manhã e à noite"), quanto ("dois comprimidos", "meio"), se está igual à receita ("sim") e se quer foto. O nome e o telefone também podem ser ditos.
- **Socorro:** com "socorro" (ou o botão vermelho), o app confirma, avisa a família conectada no celular dela e mostra botões grandes para ligar para a família e para o SAMU (192). Usa o reconhecimento de voz do Android (plugin `@capacitor-community/speech-recognition`): sem IA externa, sem custo e sem gravar o áudio. Só entende os pedidos do próprio app e não conversa sobre saúde.
- **WhatsApp:** continua como opção, para quem não quer conectar. O app prepara a mensagem e a pessoa envia.
- **"Ver como a família vê":** mostra o painel da família com os dados do próprio celular, para apresentar sem um segundo aparelho.

## Acessibilidade

- **Sem gênero fixo:** os textos usam o nome da pessoa ("Ligar para Seu Antônio", "celular de Dona Lúcia") em vez de "ela/dela".
- **Um caminho por vez:** a bula abre por "Ler a bula"; o QR code e o site da Anvisa só aparecem se a bula não abrir. "Testar sem caixa" e "Ver como a família vê" só existem no modo demonstração. O WhatsApp só aparece quando ninguém está conectado.
- **Boas-vindas com 3 escolhas** (Começar, Usar falando, Sou da família); tamanho da letra e modo calmo em "Mais opções" ou por voz ("letra maior").

- Letra Atkinson Hyperlegible, feita para baixa visão, de Normal a Muito grande (130%).
- Contraste alto, modo escuro e **Modo calmo** (sem animações e voz só quando a pessoa pede).
- Tudo o que aparece na tela pode ser ouvido pelo botão "Ouvir".
- Botão Voltar do Android funciona: fecha a janela aberta ou volta uma tela.
- Cada remédio tem cor e inicial (ou a foto da caixa), para não depender só da cor.

## Segurança e criptografia

- **No celular:** os dados ficam guardados com AES-256-GCM (`www/cofre.js`). No app instalado, a chave é guardada pelo **Android Keystore** (`android-src/Cofre.java`, `CofrePlugin.java`) e não pode ser copiada. Os dados antigos, sem criptografia, são criptografados na primeira abertura. O backup automático do Google fica desligado (`allowBackup="false"`).
- **Na conexão com a família (ponta a ponta):**
  - Os dois celulares combinam uma chave com ECDH P-256; a chave nunca passa pela internet.
  - As mensagens vão em AES-256-GCM por um servidor de passagem (ntfy, código aberto), que só vê texto embaralhado e apaga em poucas horas.
  - O código de 6 números serve só para os dois celulares se encontrarem. Ninguém é conectado sem o "Aceitar" de quem toma o remédio.
- **A família vê:** nome, remédios, horários, o que foi marcado e os avisos. **Não vê:** fotos, contatos, localização.
- Testado com dois celulares simulados e um servidor de passagem local: o servidor recebeu 7 mensagens, e nenhuma continha nome, remédio ou horário legível.

## Conformidade (LGPD e Ato Médico)

- **Consentimento específico e destacado** para dados de saúde (LGPD, art. 11, I), com versão nova quando os termos mudam. Há um consentimento próprio para quem acompanha.
- **Medidas de segurança** (LGPD, art. 46): criptografia no aparelho e de ponta a ponta.
- **Compartilhamento só com aceite** de quem toma o remédio, e qualquer um dos dois pode desligar a conexão.
- **Reproduzir, não recomendar** (Lei 12.842/2013): os textos sobre remédios são trechos literais da bula oficial; quem define dose e horário é a receita.
- **Pendente para uma versão com parceiros:**
  - validação do cadastro por farmacêutico;
  - servidor de passagem próprio no Brasil, em vez do ntfy.sh público. O ntfy pode ser instalado em servidor próprio; o endereço fica em `RELAY`, no `www/index.html`.

## Tecnologias

HTML, CSS e JavaScript empacotados como app Android com [Capacitor](https://capacitorjs.com). Leitura com ML Kit (no celular) e ZXing (na web). Voz com o motor de texto em fala e o reconhecimento de voz do Android, alarmes com notificações locais e criptografia com Web Crypto e Android Keystore. Plugins Android próprios em Java: Energia, Cofre e Elo (com EloJob). O APK é gerado pelo GitHub Actions a cada envio para a branch `main`.

## Estrutura

```
www/index.html        app (telas, leitura, voz, agenda, conexão com a família)
www/cofre.js          criptografia dos dados guardados no celular
www/base.json         lista CMED/Anvisa compactada (23/09/2026)
www/bulas.json        69 bulas do paciente oficiais (Bulário Eletrônico da Anvisa)
www/farmacias.json    farmácias da Farmácia Popular no Recife
www/postos.json       postos de saúde do Recife e remédios em estoque (dados abertos)
www/privacidade.html  privacidade e termos (link para a Google Play)
android-src/          plugins Android próprios: Energia, Cofre (Keystore), Elo e EloJob (família com o app fechado)
scripts/              cópia de bibliotecas, ajustes do Android e conversão dos dados
.github/workflows/    geração automática do APK
```

## Avisos

O Remédio Falado é um **lembrete**: não indica nem muda dose e não substitui o médico. Protótipo acadêmico; os textos ainda precisam de revisão de farmacêutico. Os códigos de barras vêm da lista de preços CMED/Anvisa, que pode conter erros.

## Créditos de dados

- Lista de preços CMED/Anvisa e Bulário Eletrônico da Anvisa. A busca de bulas usa a API interna do Bulário, que não é documentada e pode mudar.
- Textos das bulas incluídas: extraídos pelo projeto [buladiff](https://github.com/vasfvitor/buladiff) (licença MIT).
- Postos de saúde: dados abertos da Prefeitura do Recife.

## Licença

Todos os direitos reservados. Veja o arquivo `LICENSE`.

## Autor

Criado pelo Squad 4 · CESAR School (Recife) · 2026.
