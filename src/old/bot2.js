const TelegramBot = require('node-telegram-bot-api');
var zmq = require("zeromq"), sock = zmq.socket("push");

sock.bindSync("tcp://127.0.0.1:3000");
console.log("Publisher bound to port 3000");
sock.send(['started sock'])


const token = '7114630650:AAGTxhhwfrZ7PlbN7drGUS7LSxayoVuJXaM';
const bot = new TelegramBot(token, { polling: true });


bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const messageText = msg.text;

	console.log(`Received :${messageText} from ${chatId}`)

	switch (messageText.toLowerCase()) {

		case '/start':
			bot.sendMessage(chatId, 'Welcome to Bogdabot')
			break;

		case 'start':
			console.log('start')
			try {
				sock.send(['start'])
				console.log('sent message start on zmq')
				// sock.send(['start']).then(s => {
				// 	console.log('sent message start on zmq')
				// 	//bot.sendMessage('sent message'));
				// })
			} catch (e) { console.log(e) }
			break;

		case 'stop':
			//sock.send(['stop']).then(s=>bot.sendMessage(s));
			//	  await send_queue('stop');
			console.log('stop')
			break;
	}
});







//}
//run()

// (async () => {
// 	try {
// 		await sock.bind("tcp://127.0.0.1:3000")
// 		await sock.send(['bot started'])
// 		console.log("Publisher bound to port 3000")
// 	} catch (e) {
// 		console.log(e)
// 	}
// })();

