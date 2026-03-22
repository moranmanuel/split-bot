require("dotenv/config");
const express = require("express");
const SplitBot = require("./bot");
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL; // your Cloud Run https URL
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // random string
const PORT = Number(process.env.PORT ?? 8080);

const WEBHOOK_PATH = `/telegram/${WEBHOOK_SECRET}`;

const splitbot = new SplitBot();

const bot = new Telegraf(BOT_TOKEN);

bot.command("gastar", (ctx) => {
  splitbot.guardarGasto(ctx);
});

bot.command("listar", (ctx) => {
  splitbot.mostrarGasto(ctx);
});

bot.start((ctx) => {
  ctx.reply("Hola 😎 Ya estoy vivo");
});

bot.hears("hola", (ctx) => {
  ctx.reply("Tu nariz contra mis bolas");
});

bot.launch();

const app = express();

// Telegram sends JSON
app.use(express.json());

// Healthcheck (useful for Cloud Run)
app.get("/", (_req, res) => res.status(200).send("ok"));

// Webhook endpoint
app.post(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// Start server and set webhook
app.listen(PORT, async () => {
  // Set webhook on boot (idempotent-ish; you can also do this in a deploy step)
  await bot.telegram.setWebhook(`${PUBLIC_URL}${WEBHOOK_PATH}`);
  console.log(`Listening on ${PORT}. Webhook: ${PUBLIC_URL}${WEBHOOK_PATH}`);
});

console.log("Bot corriendo 🚀");
