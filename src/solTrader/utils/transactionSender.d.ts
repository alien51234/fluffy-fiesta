/// <reference types="node" />
import { BlockhashWithExpiryBlockHeight, Connection, VersionedTransactionResponse } from "@solana/web3.js";
type TransactionSenderAndConfirmationWaiterArgs = {
    connection: Connection;
    serializedTransaction: Buffer;
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
};
export declare function transactionSenderAndConfirmationWaiter({ connection, serializedTransaction, blockhashWithExpiryBlockHeight, }: TransactionSenderAndConfirmationWaiterArgs): Promise<VersionedTransactionResponse | null>;
export {};
