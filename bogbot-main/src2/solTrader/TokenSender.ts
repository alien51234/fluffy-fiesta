import {
    Connection, PublicKey, Keypair, Transaction, SystemProgram, ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Buffer } from 'buffer';

class TokenSender {
    private connection: Connection;
    private senderKeypair: Keypair;

    constructor(endpoint: string, senderPrivateKeyBase64: string) {
        this.connection = new Connection(endpoint, 'confirmed');
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

    public async sendToken(tokenMintAddress: string, recipientAddress: string, amount: bigint, useMax: boolean): Promise<string> {
        const tokenMintPublicKey = new PublicKey(tokenMintAddress);
        const recipientPublicKey = new PublicKey(recipientAddress);

        const senderTokenAccountAddress = await getAssociatedTokenAddress(tokenMintPublicKey, this.senderKeypair.publicKey);
        const recipientTokenAccountAddress = await getAssociatedTokenAddress(tokenMintPublicKey, recipientPublicKey);

        // Ensure both sender and recipient token accounts are properly set up
        const senderTokenAccount = await this.retryOperation(() =>
            getAssociatedTokenAddress(tokenMintPublicKey, this.senderKeypair.publicKey)
        );
        const recipientTokenAccount = await this.retryOperation(() =>
            getAssociatedTokenAddress(tokenMintPublicKey, recipientPublicKey)
        );

        const transaction = new Transaction();
        transaction.add(

            createTransferInstruction(
                senderTokenAccount, recipientTokenAccount, this.senderKeypair.publicKey, amount, [], TOKEN_PROGRAM_ID
            )
        );

        // Add Compute Budget Instructions for higher priority
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })
        );

        return this.retryOperation(async () => {
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.senderKeypair.publicKey;
            const signature = await this.connection.sendTransaction(transaction, [this.senderKeypair], { skipPreflight: true });
            await this.connection.confirmTransaction(signature, 'finalized');
            return signature;
        });
    }
}

export default TokenSender;
