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
    constructor(endpoint, senderPrivateKeyBase64) {
        this.connection = new web3_js_1.Connection(endpoint, 'confirmed');
        const senderKeypair = web3_js_1.Keypair.fromSecretKey(Buffer.from(senderPrivateKeyBase64, 'base64'));
        this.wallet = new anchor_1.Wallet(senderKeypair);
    }
    getFeeEstimate(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const { feeCalculator } = yield this.connection.getRecentBlockhash('confirmed');
            return BigInt(feeCalculator.lamportsPerSignature) * BigInt(transaction.signatures.length);
        });
    }
    sendSOL(recipientAddress, totalAmountLamports, useBalance) {
        return __awaiter(this, void 0, void 0, function* () {
            const recipientPublicKey = new web3_js_1.PublicKey(recipientAddress);
            const accountInfo = yield this.connection.getAccountInfo(this.wallet.publicKey);
            if (!accountInfo)
                throw new Error("Failed to fetch account info.");
            let initialBalance = accountInfo.lamports;
            if (useBalance) {
                totalAmountLamports = BigInt(initialBalance);
            }
            console.log("Account balance:", initialBalance);
            // Fee estimation transaction
            const tempTransaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: this.wallet.publicKey,
                toPubkey: recipientPublicKey,
                lamports: 10000 // Minimum amount for fee calculation
            }));
            const feeInLamports = yield this.getFeeEstimate(tempTransaction);
            console.log("Estimated fees:", feeInLamports);
            const sendAmountLamports = BigInt(totalAmountLamports) - feeInLamports - BigInt(500);
            if (sendAmountLamports <= 0) {
                throw new Error("Insufficient funds to cover the transaction and fees.");
            }
            const latestBlockhashInfo = yield this.connection.getLatestBlockhash('confirmed');
            let lastSignature = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                console.log("Attempt:", attempt);
                try {
                    const transaction = new web3_js_1.Transaction({
                        feePayer: this.wallet.publicKey,
                        recentBlockhash: latestBlockhashInfo.blockhash
                    }).add(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 500 }), web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }), web3_js_1.SystemProgram.transfer({
                        fromPubkey: this.wallet.publicKey,
                        toPubkey: recipientPublicKey,
                        lamports: sendAmountLamports,
                    }));
                    lastSignature = yield this.connection.sendTransaction(transaction, [this.wallet.payer], { skipPreflight: true });
                    yield this.connection.confirmTransaction(lastSignature, 'confirmed');
                    return lastSignature;
                }
                catch (error) {
                    console.error("Error during transaction:", error);
                    yield new Promise(resolve => setTimeout(resolve, 1000)); // Delay to handle possible network congestion
                }
            }
            throw new Error(`Failed to send SOL after 3 attempts.`);
        });
    }
}
exports.default = SOLTransfer;
