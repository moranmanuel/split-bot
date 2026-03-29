import "dotenv/config";

import { db } from "@splitbot/db";

import { type Context, type MiddlewareFn, Telegraf } from "telegraf";
import type { Message, Update } from "telegraf/typings/core/types/typegram.js";

type BaseTextContext = Context<Update.MessageUpdate<Message.TextMessage>>;

type CommandContext = BaseTextContext & {
  match: RegExpExecArray;
  command: string;
  payload: string;
  args: string[];
};

type CommandHandler = MiddlewareFn<CommandContext>;

const splitBot = {
  addData: async (data: object, table: string) => {
    const { error } = await db.from(table).insert(data);
    return error;
  },
  getUserAndGroupData: async (id: number, groupCode: string) => {
    const userQuery = db
      .from("users")
      .select("id")
      .eq("telegram_id", id)
      .single();

    const groupQuery = db
      .from("groups")
      .select("id, name")
      .eq("code", groupCode)
      .single();

    const [{ data: dataUser }, { data: dataGroup }] = await Promise.all([
      userQuery,
      groupQuery,
    ]);

    return {
      userId: dataUser?.id,
      groupId: dataGroup?.id,
      groupName: dataGroup?.name,
    };
  },
  joinGroup: async (id: number, groupCode: string): Promise<string> => {
    const { userId, groupId, groupName } = await splitBot.getUserAndGroupData(
      id,
      groupCode
    );

    const { data } = await db
      .from("group_members")
      .select("*")
      .eq("user_id", userId)
      .order("last_joined_at", { ascending: false })
      .single();

    if (!data) {
      throw new Error(`No existe grupo con el codigo: ${groupCode}`);
    }

    await db
      .from("group_members")
      .update({ last_joined_at: new Date() })
      .eq("group_id", groupId);

    return groupName;

    // ctx.reply(`Te uniste al grupo: ${groupName}`);

    // if (data.some((gm) => gm.group_id === groupId)) {
    //   if (data[0].group_id == groupId) {
    //     ctx.reply(`Ya estas en el grupo ${groupName}`);
    //   } else {
    //   }
    // } else if (groupName) {
    //   const newGroupMember = { user_id: userId, group_id: groupId };
    //   await splitBot.addData(newGroupMember, "group_members");
    //   ctx.reply(`Te uniste al grupo: ${groupName}`);
    // }
  },

  createGroup: async (newGroup: { name: string; code: string }) => {
    await splitBot.addData(newGroup, "groups");
  },

  getGroupCodes: async () => {
    const { data } = await db.from("groups").select("slug");
    return data;
  },

  createExpense: async (
    id: number,
    user: string,
    amount: string,
    description: string
  ) => {
    const { userId } = await splitBot.getUserAndGroupData(id);

    const { data } = await db
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .order("last_joined_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      throw new Error("El usuario no esta en ningun grupo");
    }

    const dataGroupQuery = db
      .from("groups")
      .select("name")
      .eq("id", data.group_id)
      .single();

    const dataGroupMembersQuery = db
      .from("group_members")
      .select("users(name), user_id")
      .eq("group_id", data.group_id)
      .eq("users.name", user)
      .single();

    const [{ data: dataGroup }, { data: dataGroupMembers }] = await Promise.all(
      [dataGroupQuery, dataGroupMembersQuery]
    );

    if (!dataGroup) {
      throw new Error("No existe la columna name en la tabla groups");
    }

    if (data && dataGroupMembers) {
      const newExpense = {
        amount,
        description,
        user_id: dataGroupMembers.user_id,
        group_id: data.group_id,
      };

      await splitBot.addData(newExpense, "expenses");
      return dataGroup.name;
    }
    if (data) {
      throw new Error("No existe ese usuario en este grupo");
    }
    throw new Error("Para guardar un gasto primero debes estar en un grupo");
  },
};

const splitBotCommandHandlers = {
  createUser: async (ctx) => {
    if (!ctx) {
      throw new Error('Message "from" is missing');
    }

    const newUser = { telegram_id: ctx?.from.id, name: ctx.from.first_name };
    await splitBot.addData(newUser, "users");
  },

  showExpenses: async (ctx) => {
    const { userId } = await splitBot.getUserAndGroupData(ctx);

    const { data: dataGroupMembers } = await db
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .order("last_joined_at", { ascending: false })
      .limit(1)
      .single();

    if (!dataGroupMembers) {
      throw new Error("El usuario no esta en ningun grupo");
    }

    const groupsQuery = db
      .from("groups")
      .select("name")
      .eq("id", dataGroupMembers.group_id)
      .single();

    const expensesQuery = db
      .from("expenses")
      .select("amount, description, users(name)")
      .eq("group_id", dataGroupMembers.group_id);

    const [{ data: dataGroup }, { data: dataExpenses }] = await Promise.all([
      groupsQuery,
      expensesQuery,
    ]);

    if (!dataGroup) {
      throw new Error("Query error");
    }

    if (!dataExpenses) {
      throw new Error("Query error");
    }

    let text = `Gastos ${dataGroup.name}:\n`;

    for (const expense of dataExpenses) {
      text += `${expense.users.name}: $${expense.amount} ${expense.description} \n`;
    }

    await ctx.reply(text);
  },

  createExpense: async (ctx) => {
    if (!ctx.message) {
      throw new Error("Message payload is undefined");
    }

    const args = ctx.message.text.split(" ").slice(1);

    const user = args[0];
    const amount = args[1];
    const concept = args.slice(2).join(" ");
    const description = concept.charAt(0).toUpperCase() + concept.slice(1);
    const telegramId = ctx.from.id;

    if (!(user && amount && description)) {
      throw new Error("Missing data");
    }

    const groupName = splitBot.createExpense(
      telegramId,
      user,
      amount,
      description
    );

    if (groupName) {
      await ctx.reply(
        "✅ <b>Gasto guardado</b>\n\n" +
          "📌 <b>Detalles</b>\n" +
          "━━━━━━━━━━━━━━\n" +
          `👥 ${groupName}\n` +
          `👤 ${user}\n` +
          `🧾 ${description}\n` +
          `💲 $${amount}`,
        { parse_mode: "HTML" }
      );
    } else {
      throw new Error("Query error");
    }
  },

  createGroup: async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const concept = args.join(" ");
    const groupName = concept.charAt(0).toUpperCase() + concept.slice(1);

    let groupCode = String(Math.floor(Math.random() * 100_000)).padStart(
      5,
      "0"
    );

    const data = await splitBot.getGroupCodes();

    if (!data) {
      throw new Error("Query Error");
    }

    let exists = true;

    while (exists) {
      groupCode = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
      exists = data.some((g) => g.slug === groupCode);
    }

    const newGroup = { name: groupName, code: groupCode };

    await splitBot.createGroup(newGroup);

    await ctx.reply(
      "✅ <b>Grupo creado</b>\n\n" +
        "📌 <b>Detalles</b>\n" +
        "━━━━━━━━━━━━━━\n" +
        `👥 <b>Grupo:</b> ${groupName}\n` +
        `🔑 <b>Código:</b> <code>${groupCode}</code>`,
      { parse_mode: "HTML" }
    );
  },

  showCommands: async (ctx) => {
    await ctx.reply(
      "📌 <b>Comandos del bot</b>\n\n" +
        "📋 <b>Lista de comandos</b>\n" +
        "━━━━━━━━━━━━━━\n" +
        "🆕 /crear nombre → Crear grupo\n" +
        "Ej: <code>/crear Viaje</code>\n\n" +
        "🔑 /unirse codigo → Unirse a grupo\n" +
        "Ej: <code>/unirse ABC123</code>\n\n" +
        "💲 /gastar usuario precio descripcion\n" +
        "Ej: <code>/gastar Manuel 500 Pizza</code>",
      { parse_mode: "HTML" }
    );
  },

  joinGroup: async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);

    const telegramId = ctx.from.id;
    const groupCode = args.join(" ");

    const groupName = await splitBot.joinGroup(telegramId, groupCode);

    ctx.reply(`Te uniste al grupo: ${groupName}`);
  },
} satisfies Record<string, CommandHandler>;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("Missing bot config env vars");
}

const bot = new Telegraf(BOT_TOKEN);

bot.command("gastar", async (ctx) => {
  await splitBotCommandHandlers.createExpense(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.command("listar", async (ctx) => {
  await splitBotCommandHandlers.showExpenses(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.command("crear", async (ctx) => {
  await splitBotCommandHandlers.createGroup(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.command("unirse", async (ctx) => {
  await splitBotCommandHandlers.joinGroup(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.start(async (ctx) => {
  await splitBotCommandHandlers.createUser(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.launch();
console.log("Bot corriendo 🚀");
