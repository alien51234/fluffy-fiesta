import { Connection } from "@solana/web3.js";
declare class TradeExecutor {
    private jupiterApi;
    private connection;
    private wallet;
    constructor(connection: Connection, senderPrivateKeyBase64: string);
    private getTokenDecimals;
    private delay;
    executeTrade(inToken: string, outToken: string, realAmount: number, slippageRate: number): Promise<string>;
}
export default TradeExecutor;
