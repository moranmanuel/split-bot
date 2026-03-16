const userExpenses = {}
import 'dotenv/config'
import { supabase } from '../../supabaseclient.js';


class SplitBot {
    static createUser = async (ctx) => {
      const newUser = { telegram_id:ctx.from.id, name:ctx.from.first_name }
      await SplitBot.addData(newUser, 'users')

      ctx.reply('Hola 😎 Ya estoy vivo')
    }

    static showExpense(ctx) {
        const userId = ctx.from.id
        const name = ctx.from.first_name  

        const expenses = userExpenses[userId]?.expenses

        if (!expenses || expenses.length === 0) {
          return ctx.reply("No hay gastos aún 🤷‍♂️")
        }

        const texto = expenses
          .map(g => `$${g.amount} - ${g.description}`)
          .join("\n")

        ctx.reply(texto)
    }
    
    static createExpense = async(ctx) => {
        const args = ctx.message.text.split(' ').slice(1)

        const amount = args[0]
        const concept = args.slice(1).join(' ')
        const description = concept.charAt(0).toUpperCase() + concept.slice(1)

        const { userId } = await SplitBot.getIds(ctx)

        const { data } = await supabase.from("group_members").select("group_id").eq("user_id", userId).order("last_joined_at", { ascending: false }).limit(1).single()

        if(data) {
          const newExpense = { amount: amount, description: description, user_id: userId, group_id: data.group_id }
  
          await SplitBot.addData(newExpense, 'expenses')
  
          ctx.reply("Gasto guardado")
          ctx.reply(`Precio $${amount} | Motivo: ${description}`)
        } else {
          ctx.reply("Para guardar un gasto primero debes estar en un grupo (/unirse XXXXX)")
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

      ctx.reply(`Grupo ${groupName} creado`)
      ctx.reply(`Codigo: ${groupCode}`)
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

    static addData = async(data, table) => {
      const { error } = await supabase.from(table).insert(data);
      return error;
    }
}

import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.command('gastar', (ctx) => {
  SplitBot.createExpense(ctx)
})
  
bot.command('listar', (ctx) => {
  SplitBot.showExpense(ctx)
})

bot.command('crear', (ctx) => {
  SplitBot.createGroup(ctx)
})

bot.command('unirse', (ctx) => {
  SplitBot.joinGroup(ctx)
})

bot.start((ctx) => {
  SplitBot.createUser(ctx)
})
  
bot.hears(/hola/i, (ctx) => {
  ctx.reply('Tu nariz contra mis bolas')
})

bot.launch()

console.log('Bot corriendo 🚀')