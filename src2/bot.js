const TelegramBot = require('node-telegram-bot-api');
const token = '7114630650:AAGTxhhwfrZ7PlbN7drGUS7LSxayoVuJXaM';
const bot = new TelegramBot(token, { polling: true });

var zmq = require("zeromq"),
  sock = zmq.socket("pub");

sock.bindSync("tcp://127.0.0.1:3000");
console.log("Publisher bound to port 3000");

setInterval(function() {
  console.log("sending a multipart message envelope");
  sock.send(["ping"]);
}, 5000);

sock.send(['test'])
sock.send(['test'])
sock.send(['test'])
sock.send(['test'])


let gl_name='global varibale'

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	const messageText = msg.text;

	console.log(`Received :${messageText} from ${chatId}`)

	switch (messageText.toLowerCase()) {

		case '/start':
			bot.sendMessage(chatId, 'Welcome to Bogdabot')
			break;

		case 'start':
			console.log(`start ${gl_name}`)
			try {
				sock.send(['start'])
				console.log('sent message start on zmq')
			} catch (e) { console.log(e) }
			break;

		case 'stop':
			sock.send(['stop'])
			console.log('stop')
			break;
	}
});
