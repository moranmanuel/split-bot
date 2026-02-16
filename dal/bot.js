let monto = 1500
let motivo = "Pizzas"

class SplitBot {
    constructor() {
    }

    mostrarGasto(ctx) {
        ctx.reply(`Monto: ${monto} | Concepto: ${motivo}`)
    }
    
    guardarGasto(ctx) {
        const args = ctx.message.text.split(' ').slice(1)

        const monto = args[0]
        const concepto = args.slice(1).join(' ')
        const motivo = concepto.charAt(0).toUpperCase() + concepto.slice(1)

        ctx.reply(`Monto: ${monto} | Concepto: ${motivo}`)
    }
}

let splitbot = new SplitBot()

const { Telegraf } = require('telegraf')

const bot = new Telegraf('8570386733:AAGZCYA8zRs_aNqoIcjpdoh1RVovMzb-2YY')

bot.command('gasto', (ctx) => {
  splitbot.guardarGasto(ctx)
})

bot.command('listar', (ctx) => {
  splitbot.mostrarGasto(ctx)
})

bot.start((ctx) => {
  ctx.reply('Hola 😎 Ya estoy vivo')
})

bot.hears('hola', (ctx) => {
  ctx.reply('Tu nariz contra mis bolas')
})

bot.launch()

console.log('Bot corriendo 🚀')