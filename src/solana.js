const SOLANA = require('@solana/web3.js');
const { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } = SOLANA;

const endpoint = 'https://api.mainnet-beta.solana.com/';
const senderPrivateKey = 'tjrvvz+8QqEDclRkGiC8xmAUZrZ/TC/V0tNdu3dq7oYWRCmGoepC3pOJf9saCk6j6HBmqtBn9Jyhlkm5jo2Xig==';
const tokenMintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const quicknode = 'https://maximum-holy-arrow.solana-mainnet.quiknode.pro/61014782ec5a4688657111e0af0040634fdfeb19/';

const SOLANA_CONNECTION = new Connection(quicknode);

module.exports.getBalanceForAddress = function (WALLET_ADDRESS) {
	return SOLANA_CONNECTION.getBalance(new PublicKey(WALLET_ADDRESS));
};

//     (async () => {
// 	let balance = await SOLANA_CONNECTION.getBalance(new PublicKey(WALLET_ADDRESS));
// 	console.log(`Wallet Balance: ${balance / LAMPORTS_PER_SOL}`);
// })();
