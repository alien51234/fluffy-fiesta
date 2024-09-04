import { Connection } from '@solana/web3.js';
declare class SolanaTrader {
    private tradeExecutor;
    private solTransfer;
    private tokenSender;
    private connection;
    private senderPrivateKeyBase64;
    constructor(connection: Connection, senderPrivateKeyBase64: string);
    solAddress: string;
    long: string;
    newOrder(tokenMintAddress: string, side: string, realAmount: number, slippageRate: number): Promise<string>;
    send(tokenMintAddress: string, recipientAddress: string, quantity: number, useMax: boolean): Promise<string>;
    balance(tokenMintAddress: string): Promise<number>;
    relativeBalance(tokenMintAddress: string): Promise<{
        solBalance: number;
        splTokenBalance: number;
        relativeSol: number;
        relativeSplToken: number;
        totalValueInSol: number;
        splLamp: number;
        solLamp: number;
        tokenDecimals: number;
    }>;
    sendSOl(recipientAddress: string, amount: number, useMax: boolean): Promise<string>;
    sendToken(tokenMintAddress: string, recipientAddress: string, amount: number): Promise<string>;
    SolBalance(): Promise<number>;
    TokenBalance(tokenMintAddress: string): Promise<number>;
    executeTrade(inToken: string, outToken: string, realAmount: number, slippageRate: number): Promise<string>;
}
export default SolanaTrader;
