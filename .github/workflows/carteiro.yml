name: Publicar o carteiro (notificação instantânea)

# Publica o carteiro no Cloudflare Workers, confere se está no ar, grava o endereço em www/carteiro.json
# e, se o endereço mudou, gera o APK de novo. Passo a passo da configuração: docs/notificacao-instantanea.md

on:
  push:
    branches: [main]
    paths: ['carteiro/**', '.github/workflows/carteiro.yml']
  workflow_dispatch:

permissions:
  contents: write
  actions: write

concurrency: carteiro

jobs:
  publicar:
    runs-on: ubuntu-latest
    steps:
      - name: Baixar o código
        uses: actions/checkout@v4

      - name: Conferir os segredos
        env:
          CF_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CF_CONTA: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          FIREBASE_SA: ${{ secrets.FIREBASE_SA }}
        run: |
          faltam=""
          [ -n "$CF_TOKEN" ] || faltam="$faltam CLOUDFLARE_API_TOKEN"
          [ -n "$CF_CONTA" ] || faltam="$faltam CLOUDFLARE_ACCOUNT_ID"
          [ -n "$FIREBASE_SA" ] || faltam="$faltam FIREBASE_SA"
          if [ -n "$faltam" ]; then echo "::error::Faltam os segredos:$faltam. Veja docs/notificacao-instantanea.md"; exit 1; fi
          printf '%s' "$FIREBASE_SA" | python3 -c "import json,sys; j=json.load(sys.stdin); assert j.get('type')=='service_account' and j.get('project_id') and j.get('private_key')" \
            || { echo "::error::FIREBASE_SA precisa ser o arquivo JSON inteiro da conta de serviço do Firebase."; exit 1; }

      - name: Publicar no Cloudflare
        id: pub
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: carteiro
          command: deploy

      - name: Preparar a chave do Firebase (não vai para o repositório)
        env:
          FIREBASE_SA: ${{ secrets.FIREBASE_SA }}
        run: |
          python3 -c "import json,os; json.dump({'FIREBASE_SA': os.environ['FIREBASE_SA']}, open('carteiro/segredos.json','w'))"

      - name: Guardar a chave do Firebase no carteiro
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: carteiro
          command: secret bulk segredos.json

      - name: Apagar o arquivo temporário
        if: always()
        run: rm -f carteiro/segredos.json

      - name: Conferir se está no ar e gravar o endereço no app
        env:
          URL_PUB: ${{ steps.pub.outputs.deployment-url }}
          SAIDA: ${{ steps.pub.outputs.command-output }}
          GH_TOKEN: ${{ github.token }}
        run: |
          URL="${URL_PUB:-$(printf '%s' "$SAIDA" | grep -o 'https://[A-Za-z0-9.-]*workers\.dev' | head -1)}"
          URL="${URL%/}"
          if [ -z "$URL" ]; then
            echo "::error::O Cloudflare não devolveu o endereço. Abra Workers e Pages no painel do Cloudflare uma vez e escolha o seu subdomínio workers.dev; depois rode este fluxo de novo."
            exit 1
          fi
          echo "Endereço do carteiro: $URL"
          ok=""
          for i in 1 2 3 4 5 6 7 8 9 10; do
            if curl -fsS -m 10 "$URL/saude" | python3 -c "import json,sys; assert json.load(sys.stdin)['firebase']"; then ok=1; break; fi
            sleep 6
          done
          [ -n "$ok" ] || { echo "::error::O carteiro não respondeu com a chave do Firebase em $URL/saude"; exit 1; }
          novo="{\"url\": \"$URL\"}"
          if [ "$(cat www/carteiro.json 2>/dev/null)" != "$novo" ]; then
            echo "$novo" > www/carteiro.json
            git config user.name "github-actions[bot]"
            git config user.email "41898283+github-actions[bot]@users.noreply.github.com"
            git add www/carteiro.json
            git commit -m "Endereço do carteiro (notificação instantânea)"
            git push
            gh workflow run build-apk.yml --ref main
            echo "Endereço gravado em www/carteiro.json. O APK novo está sendo gerado."
          else
            echo "Endereço já estava certo no app."
          fi
