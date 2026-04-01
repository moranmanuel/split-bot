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

    if(!(dataUser && dataGroup)) {
      throw new Error("Query error")
    }

    return {
      userId: dataUser.id,
      groupId: dataGroup.id,
      groupName: dataGroup.name,
    };
  }, 

  createGroup: async (groupName: string, userId: number): Promise<string> => {
    let groupSlug  = String(Math.floor(Math.random() * 100_000)).padStart(
      5,
      "0"
    );
    
    const { data } = await db.from("groups").select("slug");

    if (!data) {
      throw new Error("Query Error");
    }

    let exists = true;

    while (exists) {
      groupSlug = String(Math.floor(Math.random() * 100_000)).padStart(5, "0");
      exists = data.some((g) => g.slug === groupSlug);
    }
    
    const newGroup = {name: groupName, slug: groupSlug, created_by_user_id: userId}

    await splitBot.addData(newGroup, "groups");

    return groupSlug
  },

  joinGroup: async (id: number, groupCode: string, firstName : string): Promise<string> => {
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

    if (!data) { // Si no esta en ningun grupo aun
      await splitBot.addData({user_id: userId, group_id: groupId, name: firstName}, "group_members")
      return `Te uniste al grupo: ${groupName}`
    }

    
    if (data.some((gm:{group_id: string}) => gm.group_id === groupId)) {
      if (data[0].group_id == groupId) { // Si esta actualmente en el grupo al que esta queriendo acceder
        return `Ya estas en el grupo ${groupName}`
      } else { // Si ya esta en el grupo al que esta queriendo acceder pero actualmente esta operando sobre otro grupo
        await db
          .from("group_members")
          .update({ last_joined_at: new Date() })
          .eq("group_id", groupId);
        return `Te uniste al grupo: ${groupName}`
      }
    }

    return 'Si sale este mensaje significa que hubo un error'
  },

  createExpense: async (user: string, amount: string, description: string, telegramId: number): Promise<string> => {
    const { data: dataUser } = await db
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (!dataUser) {
      throw new Error("Query error");
    }

    const { data } = await db
      .from("group_members")
      .select("id, group_id")
      .eq("user_id", dataUser.id)
      .order("last_joined_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      throw new Error("Query error");
    }

    const dataGroupQuery = db
      .from("groups")
      .select("name")
      .eq("id", data.group_id)
      .single();

    const dataGroupMembersQuery = db
      .from("group_members")
      .select("id")
      .eq("group_id", data.group_id)
      .eq("users.name", user)
      .single();

    const [{ data: dataGroup }, { data: dataGroupMembers }] = await Promise.all(
      [dataGroupQuery, dataGroupMembersQuery]
    );

    if (!(dataGroup && dataGroupMembers)) {
      throw new Error("Query error");
    }

    const newExpense = {
      amount,
      description,
      group_id: data.group_id,
      created_by_member_id: data.id,
      paid_by_member_id: dataGroupMembers.id
    };

    await splitBot.addData(newExpense, "expenses");

    return dataGroup.name;
  },

  showExpenses: async(telegramId: number) => {
    const { data: dataUser } = await db
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if(!dataUser) {
      throw new Error("Query error")
    }

    const { data: dataGroupMembers } = await db
      .from("group_members")
      .select("group_id")
      .eq("user_id", dataUser.id)
      .order("last_joined_at", { ascending: false })
      .limit(1)
      .single();

    if (!dataGroupMembers) {
      throw new Error("Query error");
    }

    const groupsQuery = db
      .from("groups")
      .select("name")
      .eq("id", dataGroupMembers.group_id)
      .single();

    const expensesQuery = db
      .from("expenses")
      .select("amount, description, payer:group_members!paid_by_member_id ( user:users(name) )")
      .eq("group_id", dataGroupMembers.group_id)

    const [{ data: dataGroup }, { data: dataExpenses }] = await Promise.all([
      groupsQuery,
      expensesQuery,
    ])
    
    if (!(dataGroup && dataExpenses)) {
      throw new Error("Query error");
    }

    return { dataGroup, dataExpenses }
  }
};

const splitBotCommandHandlers = {
  createUser: async (ctx) => {
    if (!ctx) {
      throw new Error('Message "from" is missing');
    }

    const newUser = { telegram_user_id: ctx.from.id, name: ctx.from.first_name };
    await splitBot.addData(newUser, "users");
  },
  
  createGroup: async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);
    const concept = args.join(" ");
    const groupName = concept.charAt(0).toUpperCase() + concept.slice(1);
    const userId = ctx.from.id
    
    if(!groupName) {
        await ctx.reply("Tenés que escribir un nombre de grupo. Ej: /crear miGrupo")
        return
      }
      
      const groupSlug = await splitBot.createGroup(groupName, userId);
      
      await ctx.reply(
        "✅ <b>Grupo creado</b>\n\n" +
        "📌 <b>Detalles</b>\n" +
        
        "━━━━━━━━━━━━━━\n" +
        `👥 <b>Grupo:</b> ${groupName}\n` +
        `🔑 <b>Código:</b> <code>${groupSlug}</code>`,
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
    const firstName = ctx.from.first_name;
    const groupSlug = args.join(" ");
    
    if (!groupSlug) {
      await ctx.reply("Falta el codigo de grupo. Ej: /unirse 12345")
      return
    }
    
    const outputMessage = await splitBot.joinGroup(telegramId, groupSlug, firstName);
    
    ctx.reply(outputMessage);
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
      await ctx.reply("Falta informacion. Ej: /gastar Manuel 2500 medialunas");
      return
    }
    
    const groupName = await splitBot.createExpense(
      user,
      amount,
      description,
      telegramId
    );
    
    await ctx.reply(
      "✅ <b>Gasto guardado</b>\n\n" +
        "📌 <b>Detalles</b>\n" +
        "━━━━━━━━━━━━━━\n" +
        `👥 ${groupName}\n` +
        `👤 ${user}\n` +
        `🧾 ${description}\n` +
        `💲 $${amount}`,
        { parse_mode: "HTML" }
    )
  },
  
  showExpenses: async (ctx) => {
    const telegramId = ctx.from.id
    
    const {dataGroup, dataExpenses} = await splitBot.showExpenses(telegramId)
    
    let text = `Gastos ${dataGroup.name}:\n`;
    
    for (const expense of dataExpenses) {
      text += `${expense.payer[0]?.user[0]?.name}: $${expense.amount} ${expense.description} \n`;
    }
    
    await ctx.reply(text);
  }
} satisfies Record<string, CommandHandler>;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("Missing bot config env vars");
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await splitBotCommandHandlers.createUser(ctx);
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

bot.command("gastar", async (ctx) => {
  await splitBotCommandHandlers.createExpense(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.command("listar", async (ctx) => {
  await splitBotCommandHandlers.showExpenses(ctx);
  await splitBotCommandHandlers.showCommands(ctx);
});

bot.launch();
console.log("Bot corriendo 🚀");
