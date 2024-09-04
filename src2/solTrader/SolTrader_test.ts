import SolanaTrader from './SolanaTrader';

async function main() {
    const endpoint = 'https://api.mainnet-beta.solana.com/';
    const senderPrivateKey = 'tjrvvz+8QqEDclRkGiC8xmAUZrZ/TC/V0tNdu3dq7oYWRCmGoepC3pOJf9saCk6j6HBmqtBn9Jyhlkm5jo2Xig==';
    const tokenMintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    const wSOL = 'So11111111111111111111111111111111111111112'
    const recipient = '6vjjhR43wrYGCZUgre7txmHD6e153rxYJuh3bCwgxrwe'

    const trader = new SolanaTrader(endpoint, senderPrivateKey);

    // Execute a trade
    // await trader.executeTrade(wSOL, tokenMintAddress, 0.005, 0.01);

    // // Transfer tokens
    // await trader.sendSOl( recipient, BigInt(1000), false);

    // // Send SPL token
    // await trader.sendToken(tokenMintAddress, recipient, BigInt(500));

    // await trader.SolBalance();

    // await trader.TokenBalance(tokenMintAddress)




    const r1 = await trader.newOrder(tokenMintAddress,"BUY", 0.005, 0.01);
    console.log("Result 1: " , r1)

    // Sell Trade
    const r2 = await trader.newOrder(tokenMintAddress, "SELL", 0.1, 0.01)
    console.log("Result 2: " , r2)

    // send Token
    const r3 = await trader.send(tokenMintAddress, recipient, BigInt(1000), false)
    console.log("Result 3: " , r3)

    // send SOL
    const r4 = await trader.send(wSOL, recipient, BigInt(1000), false)
    console.log("Result 4: " , r4)

    //balance SOL
    const r5 = await trader.balance(wSOL)
    console.log("Result 5: " , r5)

    //balance Token
    const r6 = await trader.balance(tokenMintAddress)
    console.log("Result 6: " , r6)
}

main();