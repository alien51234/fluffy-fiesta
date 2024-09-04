import {
    Connection, PublicKey, Keypair, VersionedTransaction, ComputeBudgetProgram,
    AccountInfo, Commitment, TransactionMessage, TransactionInstruction
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, getMint
} from '@solana/spl-token';
import { Buffer } from 'buffer';

class TokenSender {
    private connection: Connection;
    private senderKeypair: Keypair;

    constructor(connection: Connection, senderPrivateKeyBase64: string) {
        this.connection = connection;
        const senderPrivateKeyBytes = Buffer.from(senderPrivateKeyBase64, 'base64');
        this.senderKeypair = Keypair.fromSecretKey(senderPrivateKeyBytes);
    }

    private async retryOperation<T>(operation: () => Promise<T>, maxRetries = 5, backoff = 1000): Promise<T> {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries - 1) throw error;
                attempt++;
                console.log(`Attempt ${attempt} failed, retrying in ${backoff} ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                backoff *= 2; // Exponential backoff
            }
        }
        throw new Error("Max retries reached");
    }

    public async sendToken(tokenMintAddress: string, recipientAddress: string, tokenAmount: number, useMax: boolean): Promise<string> {
        const tokenMintPublicKey = new PublicKey(tokenMintAddress);
        const recipientPublicKey = new PublicKey(recipientAddress);

        const senderTokenAccountAddress = await getAssociatedTokenAddress(tokenMintPublicKey, this.senderKeypair.publicKey);
        let recipientTokenAccountAddress = await getAssociatedTokenAddress(tokenMintPublicKey, recipientPublicKey);

        const tokenMintInfo = await this.retryOperation(() => getMint(this.connection, tokenMintPublicKey));
        const decimals = tokenMintInfo.decimals;
        const amount = BigInt(Math.floor(tokenAmount * Math.pow(10, decimals)));

        // Check if recipient token account exists, create if not
        let recipientTokenAccountInfo: AccountInfo<Buffer> | null = await this.connection.getAccountInfo(recipientTokenAccountAddress);
        const instructions: TransactionInstruction[] = [];

        if (!recipientTokenAccountInfo) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    this.senderKeypair.publicKey, // payer
                    recipientTokenAccountAddress,
                    recipientPublicKey,
                    tokenMintPublicKey,
                    TOKEN_PROGRAM_ID
                )
            );
        }

        // Add the token transfer instruction
        instructions.push(
            createTransferInstruction(
                senderTokenAccountAddress, 
                recipientTokenAccountAddress, 
                this.senderKeypair.publicKey, 
                amount, 
                [], 
                TOKEN_PROGRAM_ID
            )
        );

        // Ensure transaction has enough compute budget
        instructions.push(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),  // Set higher limit for compute units
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })  // Optionally set higher priority
        );

        // Send the transaction
        return this.retryOperation(async () => {
            const latestBlockhashInfo = await this.connection.getLatestBlockhash();
            const transactionMessage = new TransactionMessage({
                payerKey: this.senderKeypair.publicKey,
                recentBlockhash: latestBlockhashInfo.blockhash,
                instructions
            });

            const versionedTransaction = new VersionedTransaction(transactionMessage.compileToLegacyMessage());
            versionedTransaction.sign([this.senderKeypair]);

            const signature = await this.connection.sendTransaction(versionedTransaction, { skipPreflight: true });
            await this.connection.confirmTransaction({ signature, blockhash: latestBlockhashInfo.blockhash, lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight }, 'finalized');
            return signature;
        });
    }
}

export default TokenSender;
