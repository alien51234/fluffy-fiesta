"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SolanaTrader_1 = __importDefault(require("./SolanaTrader"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const endpoint = 'https://api.mainnet-beta.solana.com/';
        const senderPrivateKey = 'tjrvvz+8QqEDclRkGiC8xmAUZrZ/TC/V0tNdu3dq7oYWRCmGoepC3pOJf9saCk6j6HBmqtBn9Jyhlkm5jo2Xig==';
        const tokenMintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
        const wSOL = 'So11111111111111111111111111111111111111112';
        const recipient = '6vjjhR43wrYGCZUgre7txmHD6e153rxYJuh3bCwgxrwe';
        const trader = new SolanaTrader_1.default(endpoint, senderPrivateKey);
        // Execute a trade
        // await trader.executeTrade(wSOL, tokenMintAddress, 0.005, 0.01);
        // // Transfer tokens
        // await trader.sendSOl( recipient, BigInt(1000), false);
        // // Send SPL token
        // await trader.sendToken(tokenMintAddress, recipient, BigInt(500));
        // await trader.SolBalance();
        // await trader.TokenBalance(tokenMintAddress)
        const r1 = yield trader.newOrder(tokenMintAddress, "BUY", 0.005, 0.01);
        console.log("Result 1: ", r1);
        // Sell Trade
        const r2 = yield trader.newOrder(tokenMintAddress, "SELL", 0.1, 0.01);
        console.log("Result 2: ", r2);
        // send Token
        const r3 = yield trader.send(tokenMintAddress, recipient, BigInt(1000), false);
        console.log("Result 3: ", r3);
        // send SOL
        const r4 = yield trader.send(wSOL, recipient, BigInt(1000), false);
        console.log("Result 4: ", r4);
        //balance SOL
        const r5 = yield trader.balance(wSOL);
        console.log("Result 5: ", r5);
        //balance Token
        const r6 = yield trader.balance(tokenMintAddress);
        console.log("Result 6: ", r6);
    });
}
main();
