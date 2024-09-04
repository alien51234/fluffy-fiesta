import { createJupiterApiClient, DefaultApi } from "@jup-ag/api";
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import { transactionSenderAndConfirmationWaiter } from "./utils/transactionSender";
import { getSignature } from "./utils/getSignature";
import fetch from 'node-fetch';

class TradeExecutor {
    private jupiterApi: DefaultApi;
    private connection: Connection;
    private wallet: Wallet;

    constructor(endpoint: string, senderPrivateKeyBase64: string) {
        this.jupiterApi = createJupiterApiClient();
        this.connection = new Connection(endpoint, 'confirmed');
        const senderKeypair = Keypair.fromSecretKey(Buffer.from(senderPrivateKeyBase64, 'base64'));
        this.wallet = new Wallet(senderKeypair);
    }

    private async getTokenDecimals(mintAddress: string): Promise<number> {
        const mintPublicKey = new PublicKey(mintAddress);
        const mintInfo = await this.connection.getParsedAccountInfo(mintPublicKey, 'singleGossip');
        if (!mintInfo.value) {
            throw new Error('Failed to find token mint information');
        }
        const info = mintInfo.value.data;
        if ('parsed' in info && 'info' in info.parsed && 'decimals' in info.parsed.info) {
            return info.parsed.info.decimals;
        } else {
            throw new Error('Failed to parse token decimals');
        }
    }

    private async delay(milliseconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    public async executeTrade(inToken: string, outToken: string, realAmount: number, slippageRate: number): Promise<void> {

        const inTokenDecimals = await this.getTokenDecimals(inToken);
        const slippageBps = Math.round(slippageRate * 10000);

        let retryCount = 0;
        const maxRetries = 5;
        let success = false;

        while (retryCount < maxRetries && !success) {
            try {
                const quote = await this.jupiterApi.quoteGet({
                    inputMint: inToken,
                    outputMint: outToken,
                    amount: realAmount * Math.pow(10, inTokenDecimals), // Convert to smallest unit
                    slippageBps: slippageBps,
                    onlyDirectRoutes: false,
                    asLegacyTransaction: false,
                });

                if (!quote) {
                    console.error("Unable to get quote");
                    throw new Error("Quote retrieval failed");
                }

                const swapResult = await this.jupiterApi.swapPost({
                    swapRequest: {
                        quoteResponse: quote,
                        userPublicKey: this.wallet.publicKey.toBase58(),
                        dynamicComputeUnitLimit: false,
                        prioritizationFeeLamports: "auto",
                    },
                });

                if (!swapResult) {
                    console.error("Unable to get Swap Result");
                    throw new Error("Swap retrieval failed");
                }

                const swapTransactionBuf = Buffer.from(swapResult.swapTransaction, "base64");
                var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

                transaction.sign([this.wallet.payer]);
                const signature = getSignature(transaction);

                const simulatedTransactionResponse = await this.connection.simulateTransaction(transaction, {
                    replaceRecentBlockhash: true,
                    commitment: "processed",
                });

                if (simulatedTransactionResponse.value.err) {
                    console.error("Simulation Error:", simulatedTransactionResponse.value.err, simulatedTransactionResponse.value.logs);
                    throw new Error("Simulation error occurred");
                }

                const serializedTransaction = Buffer.from(transaction.serialize());
                const blockhash = transaction.message.recentBlockhash;

                const transactionResponse = await transactionSenderAndConfirmationWaiter({
                    connection: this.connection,
                    serializedTransaction,
                    blockhashWithExpiryBlockHeight: {
                        blockhash,
                        lastValidBlockHeight: swapResult.lastValidBlockHeight,
                    },
                });

                if (!transactionResponse) {
                    console.error("Transaction not confirmed");
                    throw new Error("Transaction confirmation failed");
                }

                if (transactionResponse.meta?.err) {
                    console.error(transactionResponse.meta?.err);
                    throw new Error("Transaction failed with an error: " + JSON.stringify(transactionResponse.meta.err));
                }

                console.log(`https://solscan.io/tx/${signature}`);
                success = true; // Indicate success to break out of the retry loop
            } catch (error) {
                console.error("Error occurred, retrying...", error);
                retryCount++;
                await this.delay(1000 * Math.pow(2, retryCount)); // Exponential backoff
            }
        }

        if (!success) {
            console.error("Max retries reached, unable to complete trade.");
        }
    }
}

export default TradeExecutor;
