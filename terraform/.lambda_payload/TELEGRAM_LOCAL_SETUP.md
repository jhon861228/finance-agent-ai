# Telegram Local Connection Guide

Para conectar tu bot de Telegram con el proyecto corriendo localmente, sigue estos pasos:

## 1. Exponer el servidor local
Telegram requiere HTTPS y una URL pública para los webhooks. Usaremos **ngrok**.

1. Instala ngrok si no lo tienes: `brew install ngrok`
2. Expone el puerto 3000:
   ```bash
   ngrok http 3000
   ```
3. Copia la URL de reenvío (ej. `https://a1b2-c3d4.ngrok-free.app`).

## 2. Configurar el Webhook
Ejecuta el siguiente comando reemplazando los valores:

- `YOUR_BOT_TOKEN`: El token que te dio @BotFather.
- `NGROK_URL`: La URL que obtuviste en el paso anterior.

```bash
curl -F "url=NGROK_URL/api/telegram" https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook
```

## 3. Variables de Entorno
Asegúrate de que tu servidor local tenga el token configurado en las variables de entorno. Puedes elegir entre Bedrock (default) u OpenAI:

**Para usar Bedrock (requiere credenciales AWS con acceso a Bedrock):**
```bash
export TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
export AWS_REGION=us-east-1
npm run dev
```

**Para usar OpenAI:**
```bash
export TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
export LLM_PROVIDER=openai
export OPENAI_API_KEY=YOUR_OPENAI_KEY
npm run dev
```

**Para usar Groq (Recomendado por velocidad):**
```bash
export TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
export LLM_PROVIDER=groq
export GROQ_API_KEY=YOUR_GROQ_KEY
npm run dev
```

## 4. Probar
Escribe `/start` a tu bot en Telegram. Debería responderte y los logs aparecerán en tu terminal local.
