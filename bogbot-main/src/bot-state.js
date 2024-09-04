const { Telegraf, Scenes, session, Markup } = require('telegraf');
const { Keypair } = require('@solana/web3.js');

const token = '7114630650:AAGTxhhwfrZ7PlbN7drGUS7LSxayoVuJXaM';
const bot = new Telegraf(token);

const { get_session_from_db, save_wallet_to_db, start_trading, end_trading, cancel_session } = require('./db.js'); //.pool;

function get_wallet_content(w) {
	return w == 'valid1000' ? 10 : 0;
}

function validate_wallet(token_address) {
	return true;
}

function generateKeyPair() {
	const keypair = Keypair.generate();
	return { privateKey: Buffer.from(keypair.secretKey).toString('base64'), publicAddress: keypair.publicKey };
}

function get_keyboard(type) {
	switch (type) {
		case 1:
			return {
				reply_markup: {
					inline_keyboard: [
						[
							{ text: 'SLOW', callback_data: 'slow' },
							{ text: 'FAST', callback_data: 'fast' },
						],
						[{ text: 'CANCEL', callback_data: 'cancel' }],
					],
				},
			};

		case 2:
			return {
				reply_markup: {
					inline_keyboard: [[{ text: 'END trading', callback_data: 'end' }]],
				},
			};
	}
}

async function state(ctx, telegram_id, data, name) {
	console.log(data);
	console.log(telegram_id);
	let session = (await get_session_from_db(telegram_id))[0];
	console.log(session);

	if (data == 'start') {
		await ctx.reply(`Welcome ${name}, your chatid is ${telegram_id}`);
	}

	if (session.wallet == null) {
		let wallet = data;
		let amount = 0;
		if (get_wallet_content(wallet) == 0) {
			await ctx.reply('Please enter a wallet with enough cash to trade');
			return;
		}

		await save_wallet_to_db(session.session_id, wallet, amount);
	}

	//console.log(data);

	switch (data) {
		case 'fast':
			if (session.is_trading == false) {
				console.log('starting FAST trading');
				await start_trading(session.session_id, 'fast');
				await ctx.reply('I started the FAST trading algo', get_keyboard(2));
			}
			break;
		case 'slow':
			if (session.is_trading == false) {
				console.log('starting SLOW trading');
				await start_trading(session.session_id, 'slow');
				await ctx.reply('I started the SLOW trading algo', get_keyboard(2));
			}
			break;
		case 'cancel':
			console.log('cancelling session');
			await cancel_session(session.session_id);
			await ctx.reply('I cancelled the session');
			break;
		case 'end':
			console.log('ending trading');
			await end_trading(session.session_id);
			break;
		default:
			if (session.is_trading == false) {
				await ctx.reply('How fast do you want the trading?', get_keyboard(1));
			} else {
				await ctx.reply(`Trading with the ${session.trading_type} algo.`, get_keyboard(2));
			}
	}
}

bot.action('fast', async ctx => change_state_callback(ctx));
bot.action('slow', async ctx => change_state_callback(ctx));
bot.action('cancel', async ctx => change_state_callback(ctx));
bot.action('end', async ctx => change_state_callback(ctx));

bot.on('message', async ctx => change_state_text(ctx));
async function change_state_callback(ctx) {
	console.log('callback');
	console.log(ctx.update.callback_query);
	var data = ctx.update.callback_query.data;
	var from = ctx.update.callback_query.from;
	let telegram_id = from.id;
	let name = from.first_name;
	console.log(`data ${data}`);
	await state(ctx, telegram_id, data, name);
}

async function change_state_text(ctx) {
	console.log('text');
	var data = ctx.message.text.toLowerCase();
	var from = ctx.message.from;

	let telegram_id = from.id;
	let name = from.first_name;
	console.log(`data ${data}`);
	await state(ctx, telegram_id, data, name);
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
