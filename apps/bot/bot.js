const userExpenses = {}
import 'dotenv/config'
import { supabase } from '../../supabaseclient.js';


class SplitBot {
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
    
    static saveExpense(ctx) {
        const userId = ctx.from.id
        const name = ctx.from.first_name

        const args = ctx.message.text.split(' ').slice(1)

        const amount = args[0]
        const concepto = args.slice(1).join(' ')
        const description = concepto.charAt(0).toUpperCase() + concepto.slice(1)

        
        if (!userExpenses[userId]) {
          userExpenses[userId] = {
            name,
            expenses: []
          }
        }
        
        userExpenses[userId].expenses.push({
          amount,
          description
        })

        ctx.reply(`Gasto guardado ${name}`)
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
        exists = data.some(code => code === groupCode)
      }

      const newGroup = { name:groupName, code:groupCode }
      await SplitBot.addData(newGroup)

      ctx.reply(`Grupo ${groupName} creado`)
      ctx.reply(`Codigo: ${groupCode}`)
    }

    static joinGroup = async(ctx) => {
      const args = ctx.message.text.split(' ').slice(1)
      const groupCode = args.join(' ')

      const { data, error } = await supabase.from("groups").select("name").eq('code', groupCode)
      
      if(data.length) {
        const newUser = { name:groupName, code:groupCode }
        ctx.reply(`Te uniste al grupo: ${data[0].name}`)
      } else {
        ctx.reply(`No existe grupo con el codigo: ${groupCode}`)
      }
    }

    static addData = async(data) => {
      const { error } = await supabase.from('groups').insert(data);
      return error;
    }
}

import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

bot.command('gastar', (ctx) => {
  SplitBot.saveExpense(ctx)
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
  ctx.reply('Hola 😎 Ya estoy vivo')
})
  
bot.hears('hola', (ctx) => {
  ctx.reply('Tu nariz contra mis bolas')
})

bot.launch()

console.log('Bot corriendo 🚀')