import { 
    Connection, 
    PublicKey, 
    Keypair, 
    Transaction, 
    VersionedTransaction, 
    SystemProgram, 
    ComputeBudgetProgram, 
    TransactionMessage 
} from '@solana/web3.js';
import { Wallet } from "@project-serum/anchor";

class SOLTransfer {
    private connection: Connection;
    private wallet: Wallet;
    private senderKeypair: Keypair;

    constructor(connection: Connection, senderPrivateKeyBase64: string) {
        this.connection = connection;
        this.senderKeypair = Keypair.fromSecretKey(Buffer.from(senderPrivateKeyBase64, 'base64'));
        this.wallet = new Wallet(this.senderKeypair);
    }

    private async getFeeEstimate(): Promise<bigint> {
        const tempTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.senderKeypair.publicKey,
                toPubkey: new PublicKey("11111111111111111111111111111111"), // Dummy public key for estimation
                lamports: 10000 // Minimal amount for fee calculation
            })
        );
        tempTransaction.feePayer = this.senderKeypair.publicKey;
        const { blockhash } = await this.connection.getRecentBlockhash('confirmed');
        tempTransaction.recentBlockhash = blockhash;
        tempTransaction.sign(this.senderKeypair);
        const { feeCalculator } = await this.connection.getRecentBlockhash('confirmed');
        return BigInt(feeCalculator.lamportsPerSignature) * BigInt(tempTransaction.signatures.length);
    }

    public async sendSOL(recipientAddress: string, totalAmountSOL: number, useBalance: boolean): Promise<string> {
        const recipientPublicKey = new PublicKey(recipientAddress);
        const accountInfo = await this.connection.getAccountInfo(this.senderKeypair.publicKey);
        if (!accountInfo) throw new Error("Failed to fetch account info.");

        let totalAmountLamports = BigInt(Math.floor(totalAmountSOL * 1e9));
        if (useBalance) {
            totalAmountLamports = BigInt(accountInfo.lamports);
        }

        const feeInLamports = await this.getFeeEstimate();
        console.log("Estimated fees:", feeInLamports);

        const sendAmountLamports = totalAmountLamports - feeInLamports - BigInt(500);
        if (sendAmountLamports <= 0) {
            throw new Error("Insufficient funds to cover the transaction and fees.");
        }

        let lastSignature: string | null = null;
        const maxAttempts = 5;
        let attempt = 0;

        while (attempt < maxAttempts) {
            try {
                const latestBlockhashInfo = await this.connection.getLatestBlockhash('confirmed');
                console.log("Attempt:", attempt);

                const transactionMessage = new TransactionMessage({
                    payerKey: this.senderKeypair.publicKey,
                    recentBlockhash: latestBlockhashInfo.blockhash,
                    instructions: [
                        ComputeBudgetProgram.setComputeUnitLimit({ units: 500 }),
                        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
                        SystemProgram.transfer({
                            fromPubkey: this.senderKeypair.publicKey,
                            toPubkey: recipientPublicKey,
                            lamports: sendAmountLamports,
                        })
                    ]
                });

                const versionedTransaction = new VersionedTransaction(transactionMessage.compileToLegacyMessage());
                versionedTransaction.sign([this.senderKeypair]);

                lastSignature = await this.connection.sendTransaction(versionedTransaction, { skipPreflight: true });
                await this.connection.confirmTransaction({
                    signature: lastSignature,
                    blockhash: latestBlockhashInfo.blockhash,
                    lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight
                }, 'confirmed');

                return lastSignature;
            } catch (error: any) {
                console.error("Error during transaction:", error);

                if (error.message.includes("429 Too Many Requests")) {
                    const delay = Math.pow(2, attempt) * 500; // Exponential backoff
                    console.log(`Rate limit exceeded. Retrying after ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else if (error.message.includes("TransactionExpiredBlockheightExceededError") || error.message.includes("TransactionExpiredTimeoutError")) {
                    console.log("Transaction expired. Retrying...");
                    attempt++;
                } else {
                    throw error; // If it's another error, don't retry
                }
            }

            attempt++;
        }

        throw new Error(`Failed to send SOL after ${maxAttempts} attempts.`);
    }
}

export default SOLTransfer;
