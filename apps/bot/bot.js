const userExpenses = {}
import 'dotenv/config'
import { supabase } from '../../supabaseclient.js';


class SplitBot {
    static createUser = async (ctx) => {
      const newUser = { telegram_id:ctx.from.id, name:ctx.from.first_name }
      await SplitBot.addData(newUser, 'users')

    }

    static showExpenses = async (ctx) => {
      const { userId } = await SplitBot.getIds(ctx)
        
      const { data: dataGroupMembers } = await supabase.from("group_members").select("group_id").eq("user_id", userId).order("last_joined_at", { ascending: false }).limit(1).single()
      
      const groupsQuery = supabase.from("groups").select("name").eq("id", dataGroupMembers.group_id).single()
      
      const expensesQuery = supabase.from("expenses").select("amount, description, users(name)").eq("group_id", dataGroupMembers.group_id)  
      
      const [
        { data: dataGroup },
        { data: dataExpenses}
      ] = await Promise.all([groupsQuery, expensesQuery])
      
      let text = `Gastos ${dataGroup.name}:\n`;

      for (const expense of dataExpenses) {
        text += `${expense.users.name}: $${expense.amount} ${expense.description} \n`;
      }

      await ctx.reply(text);
    }
    
    static createExpense = async(ctx) => {
        const args = ctx.message.text.split(' ').slice(1)

        const user = args[0]
        const amount = args[1]
        const concept = args.slice(2).join(' ')
        const description = concept.charAt(0).toUpperCase() + concept.slice(1)

        const { userId } = await SplitBot.getIds(ctx)

        const { data } = await supabase.from("group_members").select("group_id").eq("user_id", userId).order("last_joined_at", { ascending: false }).limit(1).single()

        const dataGroupQuery = supabase.from("groups").select("name").eq("id", data.group_id).single()

        const dataGroupMembersQuery = supabase.from("group_members").select("users(name), user_id").eq("group_id", data.group_id).eq("users.name", user).single()

        const [
          { data: dataGroup },
          { data: dataGroupMembers }
        ] = await Promise.all([dataGroupQuery, dataGroupMembersQuery])

        if(data && dataGroupMembers) {
          const newExpense = { amount: amount, description: description, user_id: dataGroupMembers.user_id, group_id: data.group_id }
  
          await SplitBot.addData(newExpense, 'expenses')
          
          await ctx.reply(
            `✅ <b>Gasto guardado</b>\n\n` +
            `📌 <b>Detalles</b>\n` +
            `━━━━━━━━━━━━━━\n` +
            `👥 ${dataGroup.name}\n` +
            `👤 ${user}\n` +
            `🧾 ${description}\n` +
            `💲 $${amount}`,
            { parse_mode: "HTML" }
          )
        } else if(!data) {
          ctx.reply("Para guardar un gasto primero debes estar en un grupo")
        } else {
          ctx.reply("No existe ese usuario en este grupo")
        }
    }

    static createGroup = async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1)
      const concept = args.join(' ')
      const groupName = concept.charAt(0).toUpperCase() + concept.slice(1)

      let groupCode = String(Math.floor(Math.random() * 100000)).padStart(5, '0')

      const { data } = await supabase.from("groups").select("code")

      let exists = true

      while (exists) {
        groupCode = String(Math.floor(Math.random() * 100000)).padStart(5, '0')
        exists = data.some(g => g.code === groupCode)
      }

      const newGroup = { name:groupName, code:groupCode }
      await SplitBot.addData(newGroup, 'groups')

      await ctx.reply(
        `✅ <b>Grupo creado</b>\n\n` +
        `📌 <b>Detalles</b>\n` +
        `━━━━━━━━━━━━━━\n` +
        `👥 <b>Grupo:</b> ${groupName}\n` +
        `🔑 <b>Código:</b> <code>${groupCode}</code>`,
        { parse_mode: "HTML" }
      )
    }

    static getIds = async(ctx, groupCode) => {
      const userQuery = supabase
        .from("users")
        .select("id")
        .eq("telegram_id", ctx.from.id)
        .single()

      const groupQuery = supabase
        .from("groups")
        .select("id, name")
        .eq("code", groupCode)
        .single()

      const [
        { data: dataUser },
        { data: dataGroup }
      ] = await Promise.all([userQuery, groupQuery])

      return {
        userId: dataUser?.id,
        groupId: dataGroup?.id,
        groupName: dataGroup?.name
      }
    }

    static joinGroup = async(ctx) => {
      const args = ctx.message.text.split(' ').slice(1)
      const groupCode = args.join(' ')

      const { userId, groupId, groupName } = await SplitBot.getIds(ctx, groupCode)

      const { data } = await supabase.from("group_members").select("*").eq("user_id", userId).order("last_joined_at", { ascending: false })

      if (data.some(gm => gm.group_id === groupId)) {
        if(data[0].group_id == groupId) {
          ctx.reply(`Ya estas en el grupo ${groupName}`)
        } else {
          await supabase.from("group_members").update({ last_joined_at: new Date() }).eq("group_id", groupId)
          ctx.reply(`Te uniste al grupo: ${groupName}`)
        }
      } else {
        if(groupName) {
          const newGroupMember = { user_id:userId, group_id:groupId }
          await SplitBot.addData(newGroupMember, 'group_members')
          ctx.reply(`Te uniste al grupo: ${groupName}`)
        } else {
          ctx.reply(`No existe grupo con el codigo: ${groupCode}`)
        }
      }
    }

    static showCommands = async (ctx) => {
      await ctx.reply(
        `📌 <b>Comandos del bot</b>\n\n` +
        `📋 <b>Lista de comandos</b>\n` +
        `━━━━━━━━━━━━━━\n` +
        `🆕 /crear nombre → Crear grupo\n` +
        `Ej: <code>/crear Viaje</code>\n\n` +
        `🔑 /unirse codigo → Unirse a grupo\n` +
        `Ej: <code>/unirse ABC123</code>\n\n` +
        `💲 /gastar usuario precio descripcion\n` +
        `Ej: <code>/gastar Manuel 500 Pizza</code>`,
        { parse_mode: "HTML" }
      )
    }

    static addData = async(data, table) => {
      const { error } = await supabase.from(table).insert(data);
      return error;
    }
}

import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.command('gastar', async (ctx) => {
  await SplitBot.createExpense(ctx)
  await SplitBot.showCommands(ctx)
})
  
bot.command('listar', async (ctx) => {
  await SplitBot.showExpenses(ctx)
  await SplitBot.showCommands(ctx)
})

bot.command('crear', async (ctx) => {
  await SplitBot.createGroup(ctx)
  await SplitBot.showCommands(ctx)
})

bot.command('unirse', async (ctx) => {
  await SplitBot.joinGroup(ctx)
  await SplitBot.showCommands(ctx)
})

bot.start(async (ctx) => {
  await SplitBot.createUser(ctx)
  await SplitBot.showCommands(ctx)
})

bot.launch()

console.log('Bot corriendo 🚀')