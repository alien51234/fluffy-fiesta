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
const spl_token_1 = require("@solana/spl-token");
const buffer_1 = require("buffer");
class TokenSender {
    constructor(endpoint, senderPrivateKeyBase64) {
        this.connection = new web3_js_1.Connection(endpoint, 'confirmed');
        const senderPrivateKeyBytes = buffer_1.Buffer.from(senderPrivateKeyBase64, 'base64');
        this.senderKeypair = web3_js_1.Keypair.fromSecretKey(senderPrivateKeyBytes);
    }
    retryOperation(operation_1) {
        return __awaiter(this, arguments, void 0, function* (operation, maxRetries = 5, backoff = 1000) {
            let attempt = 0;
            while (attempt < maxRetries) {
                try {
                    return yield operation();
                }
                catch (error) {
                    if (attempt === maxRetries - 1)
                        throw error;
                    attempt++;
                    console.log(`Attempt ${attempt} failed, retrying in ${backoff} ms...`);
                    yield new Promise(resolve => setTimeout(resolve, backoff));
                    backoff *= 2; // Exponential backoff
                }
            }
            throw new Error("Max retries reached");
        });
    }
    sendToken(tokenMintAddress, recipientAddress, amount, useMax) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenMintPublicKey = new web3_js_1.PublicKey(tokenMintAddress);
            const recipientPublicKey = new web3_js_1.PublicKey(recipientAddress);
            const senderTokenAccountAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, this.senderKeypair.publicKey);
            const recipientTokenAccountAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, recipientPublicKey);
            // Ensure both sender and recipient token accounts are properly set up
            const senderTokenAccount = yield this.retryOperation(() => (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, this.senderKeypair.publicKey));
            const recipientTokenAccount = yield this.retryOperation(() => (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, recipientPublicKey));
            const transaction = new web3_js_1.Transaction();
            transaction.add((0, spl_token_1.createTransferInstruction)(senderTokenAccount, recipientTokenAccount, this.senderKeypair.publicKey, amount, [], spl_token_1.TOKEN_PROGRAM_ID));
            // Add Compute Budget Instructions for higher priority
            transaction.add(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }), web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }));
            return this.retryOperation(() => __awaiter(this, void 0, void 0, function* () {
                const { blockhash } = yield this.connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = this.senderKeypair.publicKey;
                const signature = yield this.connection.sendTransaction(transaction, [this.senderKeypair], { skipPreflight: true });
                yield this.connection.confirmTransaction(signature, 'finalized');
                return signature;
            }));
        });
    }
}
exports.default = TokenSender;
