import type { Context } from "telegraf";

interface Expense {
  amount: string;
  description: string;
}

interface UserExpenses {
  expenses: Expense[];
  name: string;
}

export interface BotCommandContext extends Omit<Context, "from" | "message"> {
  from: NonNullable<Context["from"]>;
  message: NonNullable<Context["message"]> & {
    text: string;
  };
}

export default class SplitBot {
  private readonly userExpenses: Record<number, UserExpenses> = {};

  mostrarGasto(ctx: BotCommandContext): ReturnType<BotCommandContext["reply"]> {
    const userId = ctx.from.id;
    const expenses = this.userExpenses[userId]?.expenses;

    if (!expenses || expenses.length === 0) {
      return ctx.reply("No hay gastos aún 🤷‍♂️");
    }

    const texto = expenses
      .map((expense) => `$${expense.amount} - ${expense.description}`)
      .join("\n");

    return ctx.reply(texto);
  }

  guardarGasto(ctx: BotCommandContext): ReturnType<BotCommandContext["reply"]> {
    const userId = ctx.from.id;
    const name = ctx.from.first_name;
    const args = ctx.message.text.split(" ").slice(1);
    const amount = args[0];
    const concept = args.slice(1).join(" ").trim();

    if (!(amount && concept)) {
      return ctx.reply("Uso: /gastar <monto> <concepto>");
    }

    const description = concept.charAt(0).toUpperCase() + concept.slice(1);

    if (!this.userExpenses[userId]) {
      this.userExpenses[userId] = {
        expenses: [],
        name,
      };
    }

    this.userExpenses[userId].expenses.push({
      amount,
      description,
    });

    return ctx.reply(`Gasto guardado ${name}`);
  }
}
