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
const api_1 = require("@jup-ag/api");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@project-serum/anchor");
const transactionSender_1 = require("./utils/transactionSender");
const getSignature_1 = require("./utils/getSignature");
class TradeExecutor {
    constructor(connection, senderPrivateKeyBase64) {
        this.jupiterApi = (0, api_1.createJupiterApiClient)();
        this.connection = connection;
        const senderKeypair = web3_js_1.Keypair.fromSecretKey(Buffer.from(senderPrivateKeyBase64, 'base64'));
        this.wallet = new anchor_1.Wallet(senderKeypair);
    }
    getTokenDecimals(mintAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const mintPublicKey = new web3_js_1.PublicKey(mintAddress);
            const mintInfo = yield this.connection.getParsedAccountInfo(mintPublicKey, 'singleGossip');
            if (!mintInfo.value) {
                throw new Error('Failed to find token mint information');
            }
            const info = mintInfo.value.data;
            if ('parsed' in info && 'info' in info.parsed && 'decimals' in info.parsed.info) {
                return info.parsed.info.decimals;
            }
            else {
                throw new Error('Failed to parse token decimals');
            }
        });
    }
    delay(milliseconds) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, milliseconds));
        });
    }
    executeTrade(inToken, outToken, realAmount, slippageRate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const inTokenDecimals = yield this.getTokenDecimals(inToken);
            const slippageBps = Math.round(slippageRate * 10000);
            let retryCount = 0;
            const maxRetries = 5;
            let success = false;
            while (retryCount < maxRetries && !success) {
                try {
                    const quote = yield this.jupiterApi.quoteGet({
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
                    const swapResult = yield this.jupiterApi.swapPost({
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
                    var transaction = web3_js_1.VersionedTransaction.deserialize(swapTransactionBuf);
                    transaction.sign([this.wallet.payer]);
                    const signature = (0, getSignature_1.getSignature)(transaction);
                    const simulatedTransactionResponse = yield this.connection.simulateTransaction(transaction, {
                        replaceRecentBlockhash: true,
                        commitment: "processed",
                    });
                    if (simulatedTransactionResponse.value.err) {
                        console.error("Simulation Error:", simulatedTransactionResponse.value.err, simulatedTransactionResponse.value.logs);
                        throw new Error("Simulation error occurred");
                    }
                    const serializedTransaction = Buffer.from(transaction.serialize());
                    const blockhash = transaction.message.recentBlockhash;
                    const transactionResponse = yield (0, transactionSender_1.transactionSenderAndConfirmationWaiter)({
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
                    if ((_a = transactionResponse.meta) === null || _a === void 0 ? void 0 : _a.err) {
                        console.error((_b = transactionResponse.meta) === null || _b === void 0 ? void 0 : _b.err);
                        throw new Error("Transaction failed with an error: " + JSON.stringify(transactionResponse.meta.err));
                    }
                    console.log(`https://solscan.io/tx/${signature}`);
                    return (signature);
                    success = true; // Indicate success to break out of the retry loop
                }
                catch (error) {
                    console.error("Error occurred, retrying...", error);
                    retryCount++;
                    yield this.delay(1000 * Math.pow(2, retryCount)); // Exponential backoff
                }
            }
            if (!success) {
                console.error("Max retries reached, unable to complete trade.");
                return ("transaction issue");
            }
            return ("transaction issue");
        });
    }
}
exports.default = TradeExecutor;
