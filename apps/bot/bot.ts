import "dotenv/config";
import { Telegraf } from "telegraf";
import { supabase } from "../../supabaseclient.js";

const userExpenses = {};
const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const splitBot = {
  showExpense(ctx) {
    const userId = ctx.from.id;
    const expenses = userExpenses[userId]?.expenses;

    if (!expenses || expenses.length === 0) {
      return ctx.reply("No hay gastos aún 🤷‍♂️");
    }

    const texto = expenses
      .map((g) => `$${g.amount} - ${g.description}`)
      .join("\n");

    ctx.reply(texto);
  },

  saveExpense(ctx) {
    const userId = ctx.from.id;
    const name = ctx.from.first_name;

    const args = ctx.message.text.split(" ").slice(1);

    const amount = args[0];
    const concepto = args.slice(1).join(" ");
    const description = concepto.charAt(0).toUpperCase() + concepto.slice(1);

    if (!userExpenses[userId]) {
      userExpenses[userId] = {
        name,
        expenses: [],
      };
    }

    userExpenses[userId].expenses.push({
      amount,
      description,
    });

    ctx.reply(`Gasto guardado ${name}`);
  },

  async createGroup(ctx) {
    const args = ctx.message.text.split(" ").slice(1);
    const concept = args.join(" ");
    const groupName = concept.charAt(0).toUpperCase() + concept.slice(1);

    let groupCode = String(Math.floor(Math.random() * 100_000)).padStart(
      5,
      "0"
    );

    const { data } = await supabase.from("groups").select("code");

    let exists = true;

    while (exists) {
      groupCode = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
      exists = data ? data.some((group) => group.code === groupCode) : false;
    }

    const newGroup = { name: groupName, code: groupCode };
    await this.addData(newGroup);

    ctx.reply(`Grupo ${groupName} creado`);
    ctx.reply(`Codigo: ${groupCode}`);
  },

  async joinGroup(ctx) {
    const args = ctx.message.text.split(" ").slice(1);
    const groupCode = args.join(" ");

    const { data } = await supabase
      .from("groups")
      .select("name")
      .eq("code", groupCode);

    if (data?.length) {
      ctx.reply(`Te uniste al grupo: ${data[0].name}`);
    } else {
      ctx.reply(`No existe grupo con el codigo: ${groupCode}`);
    }
  },

  async addData(data) {
    const { error } = await supabase.from("groups").insert(data);
    return error;
  },
};

const bot = new Telegraf(botToken);

bot.command("gastar", (ctx) => {
  splitBot.saveExpense(ctx);
});

bot.command("listar", (ctx) => {
  splitBot.showExpense(ctx);
});

bot.command("crear", (ctx) => {
  splitBot.createGroup(ctx);
});

bot.command("unirse", (ctx) => {
  splitBot.joinGroup(ctx);
});

bot.start((ctx) => {
  ctx.reply("Hola 😎 Ya estoy vivo");
});

bot.hears("hola", (ctx) => {
  ctx.reply("Tu nariz contra mis bolas");
});

bot.launch();

console.log("Bot corriendo 🚀");
