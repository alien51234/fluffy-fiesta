const { Telegraf, Scenes, session, Composer } = require("telegraf");
const { Keypair } = require("@solana/web3.js");

const token = "7114630650:AAGTxhhwfrZ7PlbN7drGUS7LSxayoVuJXaM";
const bot = new Telegraf(token);

const { get_session_from_db, Order } = require("./db.js");

// function get_wallet_content(w) {
//   console.log(`checking wallet ${w}`);
//   return w == "E3sk9qd7aGQe26Md9qEBjnSr1q4iG17qvSQ7kp8bzyYs" ? 10 : 0;
// }

// function is_wallet_valid(token_address) {
//   return token_address.startsWith("a");
// }

function generateKeyPair() {
  const keypair = Keypair.generate();
  return {
    privateKey: Buffer.from(keypair.secretKey).toString("base64"),
    publicAddress: keypair.publicKey.toString(),
  };
}

function get_keyboard(buttons) {
  return {
    reply_markup: { inline_keyboard: buttons },
    one_time_keyboard: true,
  };
}

function get_answer(ctx) {
  return ctx.update.callback_query
    ? ctx.update.callback_query.data
    : ctx.update.message.text;
}

async function state_select(ctx) {
  try {
    if (!ctx.session.data) {
      console.log('Creating session data')
      ctx.session.data = {};
      let p = generateKeyPair();
      ctx.session.data.private_key = p.privateKey;
      ctx.session.data.public_address = p.publicAddress;
      let from = ctx.message
        ? ctx.message.from
        : ctx.update.callback_query.from;

      ctx.session.data.telegram_id = from.id;
      ctx.session.data.name = from.first_name;
      console.log(ctx.session.data)
    }
    if (ctx.session.data.trade_size == null)
      return await ctx.scene.enter("order_size_wizard");
    if (ctx.session.data.trade_interval_minutes == null)
      return await ctx.scene.enter("trading_frequency_wizard");
    if (ctx.session.data.wallet == null)
      return await ctx.scene.enter("wallet_wizard");

    ctx.session.data.is_trading = true;

    await ctx.reply(`Your public address is ${ctx.session.data.publicAddress}`);
    await ctx.reply(
      "Trading will start when you will have uploaded enough funds"
    );
    ctx.session.data = Order.Create(ctx.update);
    await ctx.reply(JSON.stringify(ctx.session.data));
  } catch (e) {
    return;
  }
}

async function stop(ctx) {
  if (!ctx.session.data.is_trading) {
    ctx.reply("not trading");
    return;
  }
  ctx.session.data = {};
  ctx.reply("stopping trading");
}

async function leave(ctx) {
  console.log("Trading cancelled");
  ctx.reply("Trading cancelled");
  ctx.session.data = {};
  await ctx.scene.leave();
}

const order_size_wizard = new Scenes.WizardScene(
  "order_size_wizard",
  async (ctx) => {
    await ctx.reply(
      "What size do you want to trade?",
      get_keyboard([
        [
          { text: "3 SOL", callback_data: 3 },
          { text: "6 SOL", callback_data: 6 },
        ],
        [
          { text: "18 SOL", callback_data: 18 },
          { text: "27 SOL", callback_data: 27 },
        ],
        [{ text: "CANCEL", callback_data: "cancel" }],
      ])
    );
    ctx.session.data.trade_size = null;
    return ctx.wizard.next();
  },
  async (ctx) => {
    try {
      let q = parseFloat(get_answer(ctx));
      if (Number.isNaN(q) || q == 0) return;
      ctx.session.data.trade_size = q;
      await ctx.reply(
        `I will create trades with size of ${ctx.session.data.trade_size}`
      );
      await ctx.scene.leave();
      return await state_select(ctx);
    } catch (e) {
      return;
    }
  }
);

order_size_wizard.hears("cancel", (ctx) => leave(ctx));
order_size_wizard.action("cancel", (ctx) => leave(ctx));

const wallet_wizard = new Scenes.WizardScene(
  "wallet_wizard",
  async (ctx) => {
    await ctx.reply("What is the wallet?");
    ctx.session.data.wallet = null;
    return ctx.wizard.next();
  },
  async (ctx) => {
    try {
      let q = get_answer(ctx);
      ctx.session.data.wallet = q;
      await ctx.reply(`I will use the wallet ${ctx.session.data.wallet}`);
      await ctx.scene.leave();
      return await state_select(ctx);
    } catch (e) {
      return;
    }
  }
);

wallet_wizard.hears("cancel", (ctx) => leave(ctx));
wallet_wizard.action("cancel", (ctx) => leave(ctx));

const trading_frequency_wizard = new Scenes.WizardScene(
  "trading_frequency_wizard",
  async (ctx) => {
    await ctx.reply(
      "How fast do you want to trade?",
      get_keyboard([
        [
          { text: "SLOW", callback_data: 4 * 60 },
          { text: "FAST", callback_data: 30 },
        ],
        [{ text: "CANCEL", callback_data: "cancel" }],
      ])
    );
    ctx.session.data.trade_interval_minutes = null;
    return ctx.wizard.next();
  },
  async (ctx) => {
    try {
      let q = parseFloat(get_answer(ctx));
      if (Number.isNaN(q) || q == 0) return;
      ctx.session.data.trade_interval_minutes = q;
      ctx.reply(
        `I will create trades every ${ctx.session.data.trade_interval_minutes} minutes`
      );
      await ctx.scene.leave();
      return await state_select(ctx);
    } catch (e) {
      return;
    }
  }
);

trading_frequency_wizard.hears("cancel", (ctx) => leave(ctx));
trading_frequency_wizard.action("cancel", (ctx) => leave(ctx));

const stage = new Scenes.Stage([
  trading_frequency_wizard,
  order_size_wizard,
  wallet_wizard,
]);

bot.use(session());
bot.use(stage.middleware());

bot.command("trade", async (ctx) => await state_select(ctx));
bot.command("status", async (ctx) => ctx.reply("Trading status :"));
bot.command("stop", async (ctx) => await stop(ctx));

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
