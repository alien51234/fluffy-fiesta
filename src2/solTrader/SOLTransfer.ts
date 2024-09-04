import { Connection, PublicKey, Keypair, Transaction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { Wallet } from "@project-serum/anchor";

class SOLTransfer{
    private connection: Connection;
    private wallet: Wallet;

    constructor(endpoint: string, senderPrivateKeyBase64: string) {
        this.connection = new Connection(endpoint, 'confirmed');
        const senderKeypair = Keypair.fromSecretKey(Buffer.from(senderPrivateKeyBase64, 'base64'));
        this.wallet = new Wallet(senderKeypair);
    }

    private async getFeeEstimate(transaction: Transaction): Promise<bigint> {
        const { feeCalculator } = await this.connection.getRecentBlockhash('confirmed');
        return BigInt(feeCalculator.lamportsPerSignature) * BigInt(transaction.signatures.length);
    }

    public async sendSOL(recipientAddress: string, totalAmountLamports: bigint, useBalance: boolean): Promise<string> {
        const recipientPublicKey = new PublicKey(recipientAddress);
        const accountInfo = await this.connection.getAccountInfo(this.wallet.publicKey);
        if (!accountInfo) throw new Error("Failed to fetch account info.");

        let initialBalance = accountInfo.lamports;
        if (useBalance) {
            totalAmountLamports = BigInt(initialBalance);
        }

        console.log("Account balance:", initialBalance);

        // Fee estimation transaction
        const tempTransaction = new Transaction().add(SystemProgram.transfer({
            fromPubkey: this.wallet.publicKey,
            toPubkey: recipientPublicKey,
            lamports: 10000 // Minimum amount for fee calculation
        }));
        const feeInLamports = await this.getFeeEstimate(tempTransaction);
        console.log("Estimated fees:", feeInLamports);

        const sendAmountLamports = BigInt(totalAmountLamports) - feeInLamports - BigInt(500);
        if (sendAmountLamports <= 0) {
            throw new Error("Insufficient funds to cover the transaction and fees.");
        }

        const latestBlockhashInfo = await this.connection.getLatestBlockhash('confirmed');
        let lastSignature: string | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            console.log("Attempt:", attempt);
            try {
                const transaction = new Transaction({
                    feePayer: this.wallet.publicKey,
                    recentBlockhash: latestBlockhashInfo.blockhash
                }).add(
                    ComputeBudgetProgram.setComputeUnitLimit({ units: 500 }),
                    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
                    SystemProgram.transfer({
                        fromPubkey: this.wallet.publicKey,
                        toPubkey: recipientPublicKey,
                        lamports: sendAmountLamports,
                    })
                );

                lastSignature = await this.connection.sendTransaction(transaction, [this.wallet.payer], { skipPreflight: true });
                await this.connection.confirmTransaction(lastSignature, 'confirmed');
                return lastSignature;
            } catch (error) {
                console.error("Error during transaction:", error);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to handle possible network congestion
            }
        }

        throw new Error(`Failed to send SOL after 3 attempts.`);
    }
}

export default SOLTransfer;
