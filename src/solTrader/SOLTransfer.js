"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@project-serum/anchor");
class SOLTransfer {
    constructor(connection, senderPrivateKeyBase64) {
        this.connection = connection;
        this.senderKeypair = web3_js_1.Keypair.fromSecretKey(Buffer.from(senderPrivateKeyBase64, 'base64'));
        this.wallet = new anchor_1.Wallet(this.senderKeypair);
    }
    getFeeEstimate() {
        return __awaiter(this, void 0, void 0, function* () {
            const tempTransaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: this.senderKeypair.publicKey,
                toPubkey: new web3_js_1.PublicKey("11111111111111111111111111111111"), // Dummy public key for estimation
                lamports: 10000 // Minimal amount for fee calculation
            }));
            tempTransaction.feePayer = this.senderKeypair.publicKey;
            const { blockhash } = yield this.connection.getRecentBlockhash('confirmed');
            tempTransaction.recentBlockhash = blockhash;
            tempTransaction.sign(this.senderKeypair);
            const { feeCalculator } = yield this.connection.getRecentBlockhash('confirmed');
            return BigInt(feeCalculator.lamportsPerSignature) * BigInt(tempTransaction.signatures.length);
        });
    }
    sendSOL(recipientAddress, totalAmountSOL, useBalance) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipientPublicKey = new web3_js_1.PublicKey(recipientAddress);
            const accountInfo = yield this.connection.getAccountInfo(this.senderKeypair.publicKey);
            if (!accountInfo)
                throw new Error("Failed to fetch account info.");
            let totalAmountLamports = BigInt(Math.floor(totalAmountSOL * 1e9));
            if (useBalance) {
                totalAmountLamports = BigInt(accountInfo.lamports);
            }
            const feeInLamports = yield this.getFeeEstimate();
            console.log("Estimated fees:", feeInLamports);
            const sendAmountLamports = totalAmountLamports - feeInLamports - BigInt(500);
            if (sendAmountLamports <= 0) {
                throw new Error("Insufficient funds to cover the transaction and fees.");
            }
            let lastSignature = null;
            const maxAttempts = 5;
            let attempt = 0;
            while (attempt < maxAttempts) {
                try {
                    const latestBlockhashInfo = yield this.connection.getLatestBlockhash('confirmed');
                    console.log("Attempt:", attempt);
                    const transactionMessage = new web3_js_1.TransactionMessage({
                        payerKey: this.senderKeypair.publicKey,
                        recentBlockhash: latestBlockhashInfo.blockhash,
                        instructions: [
                            web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 500 }),
                            web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
                            web3_js_1.SystemProgram.transfer({
                                fromPubkey: this.senderKeypair.publicKey,
                                toPubkey: recipientPublicKey,
                                lamports: sendAmountLamports,
                            })
                        ]
                    });
                    const versionedTransaction = new web3_js_1.VersionedTransaction(transactionMessage.compileToLegacyMessage());
                    versionedTransaction.sign([this.senderKeypair]);
                    lastSignature = yield this.connection.sendTransaction(versionedTransaction, { skipPreflight: true });
                    yield this.connection.confirmTransaction({
                        signature: lastSignature,
                        blockhash: latestBlockhashInfo.blockhash,
                        lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight
                    }, 'confirmed');
                    return lastSignature;
                }
                catch (error) {
                    console.error("Error during transaction:", error);
                    if (error.message.includes("429 Too Many Requests")) {
                        const delay = Math.pow(2, attempt) * 500; // Exponential backoff
                        console.log(`Rate limit exceeded. Retrying after ${delay}ms...`);
                        yield new Promise(resolve => setTimeout(resolve, delay));
                    }
                    else if (error.message.includes("TransactionExpiredBlockheightExceededError") || error.message.includes("TransactionExpiredTimeoutError")) {
                        console.log("Transaction expired. Retrying...");
                        attempt++;
                    }
                    else {
                        throw error; // If it's another error, don't retry
                    }
                }
                attempt++;
            }
            throw new Error(`Failed to send SOL after ${maxAttempts} attempts.`);
        });
    }
}
exports.default = SOLTransfer;
