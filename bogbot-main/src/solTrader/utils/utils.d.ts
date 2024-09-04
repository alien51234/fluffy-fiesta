import { Connection } from '@solana/web3.js';
export declare function getBalancesAndRelativeValues(connection: Connection, senderPrivateKeyBase64: string, splTokenMintAddress: string): Promise<{
    solBalance: number;
    splTokenBalance: number;
    relativeSol: number;
    relativeSplToken: number;
    totalValueInSol: number;
    splLamp: number;
    solLamp: number;
    tokenDecimals: number;
}>;
export declare function getTokenBalance(connection: Connection, senderPrivateKeyBase64: string, tokenMintAddress: string): Promise<number>;
export declare function getSolBalance(connection: Connection, senderPrivateKeyBase64: string): Promise<number>;
