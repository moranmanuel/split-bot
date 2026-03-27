import "dotenv/config";
import { type Context, Telegraf } from "telegraf";
import SplitBot, { type BotCommandContext } from "./bot";

const express = require("express");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL; // your Cloud Run https URL
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // random string
const PORT = Number(process.env.PORT ?? 8080);

const WEBHOOK_PATH = `/telegram/${WEBHOOK_SECRET}`;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const splitbot = new SplitBot();

const bot = new Telegraf(BOT_TOKEN);

bot.command("gastar", (ctx: BotCommandContext) => {
  splitbot.guardarGasto(ctx);
});

bot.command("listar", (ctx: BotCommandContext) => {
  splitbot.mostrarGasto(ctx);
});

bot.start((ctx: Context) => {
  ctx.reply("Hola 😎 Ya estoy vivo");
});

bot.hears("hola", (ctx: Context) => {
  ctx.reply("Tu nariz contra mis bolas");
});

bot.launch();

const app = express();

// Telegram sends JSON
app.use(express.json());

// Healthcheck (useful for Cloud Run)
app.get(
  "/",
  (
    _req: unknown,
    res: { status: (code: number) => { send: (body: string) => unknown } }
  ) => res.status(200).send("ok")
);

// Webhook endpoint
app.post(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// Start server and set webhook
app.listen(PORT, async () => {
  // Set webhook on boot (idempotent-ish; you can also do this in a deploy step)
  await bot.telegram.setWebhook(`${PUBLIC_URL}${WEBHOOK_PATH}`);
  console.log(`Listening on ${PORT}. Webhook: ${PUBLIC_URL}${WEBHOOK_PATH}`);
});

console.log("Bot corriendo 🚀");
