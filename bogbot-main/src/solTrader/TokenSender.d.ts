import { Connection } from '@solana/web3.js';
declare class TokenSender {
    private connection;
    private senderKeypair;
    constructor(connection: Connection, senderPrivateKeyBase64: string);
    private retryOperation;
    sendToken(tokenMintAddress: string, recipientAddress: string, tokenAmount: number, useMax: boolean): Promise<string>;
}
export default TokenSender;
