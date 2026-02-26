let amount = 1500
let description = "Pizzas"
let groupCode = 32752
const userExpenses = {}
const groups = {}

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

    static createGroup(ctx) {
      const args = ctx.message.text.split(' ').slice(1)
      const concept = args.join(' ')
      const groupName = concept.charAt(0).toUpperCase() + concept.slice(1)

      ctx.reply(`Grupo ${groupName} creado`)
      ctx.reply(`Codigo: ${groupCode}`)

      groups.push({
        groupName,
        groupCode
      })
    }

    static joinGroup(ctx) {
      const args = ctx.message.text.split(' ').slice(1)

      ctx.reply(`Te uniste al grupo: ${groupName}`)
    }
}

const { Telegraf } = require('telegraf')

const bot = new Telegraf('8570386733:AAGZCYA8zRs_aNqoIcjpdoh1RVovMzb-2YY')

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