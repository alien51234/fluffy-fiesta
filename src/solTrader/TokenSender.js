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
    constructor(connection, senderPrivateKeyBase64) {
        this.connection = connection;
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
    sendToken(tokenMintAddress, recipientAddress, tokenAmount, useMax) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenMintPublicKey = new web3_js_1.PublicKey(tokenMintAddress);
            const recipientPublicKey = new web3_js_1.PublicKey(recipientAddress);
            const senderTokenAccountAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, this.senderKeypair.publicKey);
            let recipientTokenAccountAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, recipientPublicKey);
            const tokenMintInfo = yield this.retryOperation(() => (0, spl_token_1.getMint)(this.connection, tokenMintPublicKey));
            const decimals = tokenMintInfo.decimals;
            const amount = BigInt(Math.floor(tokenAmount * Math.pow(10, decimals)));
            // Check if recipient token account exists, create if not
            let recipientTokenAccountInfo = yield this.connection.getAccountInfo(recipientTokenAccountAddress);
            const instructions = [];
            if (!recipientTokenAccountInfo) {
                instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(this.senderKeypair.publicKey, // payer
                recipientTokenAccountAddress, recipientPublicKey, tokenMintPublicKey, spl_token_1.TOKEN_PROGRAM_ID));
            }
            // Add the token transfer instruction
            instructions.push((0, spl_token_1.createTransferInstruction)(senderTokenAccountAddress, recipientTokenAccountAddress, this.senderKeypair.publicKey, amount, [], spl_token_1.TOKEN_PROGRAM_ID));
            // Ensure transaction has enough compute budget
            instructions.push(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }), // Set higher limit for compute units
            web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }) // Optionally set higher priority
            );
            // Send the transaction
            return this.retryOperation(() => __awaiter(this, void 0, void 0, function* () {
                const latestBlockhashInfo = yield this.connection.getLatestBlockhash();
                const transactionMessage = new web3_js_1.TransactionMessage({
                    payerKey: this.senderKeypair.publicKey,
                    recentBlockhash: latestBlockhashInfo.blockhash,
                    instructions
                });
                const versionedTransaction = new web3_js_1.VersionedTransaction(transactionMessage.compileToLegacyMessage());
                versionedTransaction.sign([this.senderKeypair]);
                const signature = yield this.connection.sendTransaction(versionedTransaction, { skipPreflight: true });
                yield this.connection.confirmTransaction({ signature, blockhash: latestBlockhashInfo.blockhash, lastValidBlockHeight: latestBlockhashInfo.lastValidBlockHeight }, 'finalized');
                return signature;
            }));
        });
    }
}
exports.default = TokenSender;
