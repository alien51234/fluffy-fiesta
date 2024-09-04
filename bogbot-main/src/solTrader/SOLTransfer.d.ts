import { Connection } from '@solana/web3.js';
declare class SOLTransfer {
    private connection;
    private wallet;
    private senderKeypair;
    constructor(connection: Connection, senderPrivateKeyBase64: string);
    private getFeeEstimate;
    sendSOL(recipientAddress: string, totalAmountSOL: number, useBalance: boolean): Promise<string>;
}
export default SOLTransfer;
