
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

module.exports = SplitBot
