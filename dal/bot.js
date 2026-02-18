let monto = 1500
let motivo = "Pizzas"
const gastosPorUsuario = {}

class SplitBot {
    constructor() {
    }

    mostrarGasto(ctx) {
        const userId = ctx.from.id
        const nombre = ctx.from.first_name  

        const gastos = gastosPorUsuario[userId]?.gastos

        if (!gastos || gastos.length === 0) {
          return ctx.reply("No hay gastos aún 🤷‍♂️")
        }

        const texto = gastos
          .map(g => `$${g.monto} - ${g.descripcion}`)
          .join("\n")

        ctx.reply(texto)
    }
    
    guardarGasto(ctx) {
        const userId = ctx.from.id
        const nombre = ctx.from.first_name

        const args = ctx.message.text.split(' ').slice(1)

        const monto = args[0]
        const concepto = args.slice(1).join(' ')
        const descripcion = concepto.charAt(0).toUpperCase() + concepto.slice(1)

        
        if (!gastosPorUsuario[userId]) {
          gastosPorUsuario[userId] = {
            nombre,
            gastos: []
          }
        }
        
        gastosPorUsuario[userId].gastos.push({
          monto,
          descripcion
        })

        ctx.reply(`Gasto guardado ${nombre}`)
    }
}

let splitbot = new SplitBot()

const { Telegraf } = require('telegraf')

const bot = new Telegraf('8570386733:AAGZCYA8zRs_aNqoIcjpdoh1RVovMzb-2YY')

bot.command('gastar', (ctx) => {
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