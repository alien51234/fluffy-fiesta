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
exports.getSolBalance = exports.getTokenBalance = exports.getBalancesAndRelativeValues = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const buffer_1 = require("buffer");
const api_1 = require("@jup-ag/api");
function getTokenDecimals(connection, mintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield connection.getParsedAccountInfo(mintAddress);
        if (info.value && info.value.data && "parsed" in info.value.data) {
            return info.value.data.parsed.info.decimals;
        }
        else {
            throw new Error("Failed to retrieve or parse token decimals.");
        }
    });
}
function withRetry(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, retries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return yield fn();
            }
            catch (error) {
                if (attempt === retries) {
                    console.error('Final attempt failed:', error);
                    throw error;
                }
                console.log(`Attempt ${attempt} failed, retrying after ${delay}ms...`);
                yield new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('withRetry exhausted all attempts');
    });
}
function getBalancesAndRelativeValues(senderPrivateKeyBase64, splTokenMintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const attemptFunction = () => __awaiter(this, void 0, void 0, function* () {
            const wSOL = 'So11111111111111111111111111111111111111112';
            const jupiterQuoteApi = (0, api_1.createJupiterApiClient)();
            const connection = new web3_js_1.Connection('https://maximum-holy-arrow.solana-mainnet.quiknode.pro/61014782ec5a4688657111e0af0040634fdfeb19/', 'confirmed');
            const senderPrivateKeyBytes = buffer_1.Buffer.from(senderPrivateKeyBase64, 'base64');
            const senderKeypair = web3_js_1.Keypair.fromSecretKey(senderPrivateKeyBytes);
            const tokenMintPublicKey = new web3_js_1.PublicKey(splTokenMintAddress);
            // Fetch token decimals early as it is needed for calculations
            const tokenDecimals = yield getTokenDecimals(connection, tokenMintPublicKey);
            try {
                const senderTokenAccount = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, senderKeypair, tokenMintPublicKey, senderKeypair.publicKey);
                const senderTokenAccountInfo = yield (0, spl_token_1.getAccount)(connection, senderTokenAccount.address);
                let senderTokenBalance = 0;
                let senderTokenLamp = 0; // Default to 0 if account info is not found
                if (senderTokenAccountInfo) {
                    senderTokenBalance = Number(senderTokenAccountInfo.amount / BigInt(Math.pow(10, tokenDecimals)));
                    senderTokenLamp = Number(senderTokenAccountInfo.amount);
                }
                const senderSOLAccountInfo = yield connection.getAccountInfo(senderKeypair.publicKey);
                if (!senderSOLAccountInfo) {
                    throw new Error("Sender SOL account not found.");
                }
                const quote = yield jupiterQuoteApi.quoteGet({
                    inputMint: wSOL,
                    outputMint: splTokenMintAddress,
                    amount: 1000000000,
                    slippageBps: 50,
                    onlyDirectRoutes: false,
                    asLegacyTransaction: false,
                });
                const SPLperSOL = Number(quote.outAmount);
                const LAMPperSPLLAMP = Number(quote.inAmount) / SPLperSOL;
                console.log(SPLperSOL, "SPL per SOL varibale");
                const solLamp = senderSOLAccountInfo.lamports;
                const splLamp = senderTokenLamp;
                const splAsSolLamp = LAMPperSPLLAMP * splLamp;
                const totalLampValue = splAsSolLamp + solLamp;
                const solBalance = solLamp / Math.pow(10, 9); // LAMPORTS_PER_SOL usually equals 10^9
                const totalValueInSol = solBalance + (senderTokenBalance * (Math.pow(10, 9) / Math.pow(10, tokenDecimals)));
                const relativeSol = solLamp / totalLampValue;
                const relativeSplToken = splAsSolLamp / totalLampValue;
                console.log(`Sender token balance: ${senderTokenBalance}`);
                console.log(`Sender SOL balance (SOL): ${solBalance}`);
                console.log(`Relative SOL: ${relativeSol.toFixed(4)}, Relative SPL Token: ${relativeSplToken.toFixed(4)}`);
                return {
                    solBalance,
                    splTokenBalance: senderTokenBalance,
                    relativeSol,
                    relativeSplToken,
                    totalValueInSol,
                    splLamp, // Keep lamports as numbers for consistency with original
                    solLamp,
                    tokenDecimals,
                };
            }
            catch (error) {
                console.error("Error fetching data:", error);
                throw error;
            }
        });
        return withRetry(attemptFunction);
    });
}
exports.getBalancesAndRelativeValues = getBalancesAndRelativeValues;
function getTokenBalance(connection, senderPrivateKeyBase64, tokenMintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const senderPrivateKeyBytes = buffer_1.Buffer.from(senderPrivateKeyBase64, 'base64');
            const senderKeypair = web3_js_1.Keypair.fromSecretKey(senderPrivateKeyBytes);
            const associatedTokenAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(new web3_js_1.PublicKey(tokenMintAddress), senderKeypair.publicKey);
            // Fetch the token account details
            const tokenAccountInfo = yield (0, spl_token_1.getAccount)(connection, associatedTokenAddress);
            // Return the token balance as a number
            return Number(tokenAccountInfo.amount);
        }
        catch (error) {
            console.error('Failed to get token balance:', error);
            return 0;
        }
    });
}
exports.getTokenBalance = getTokenBalance;
function getSolBalance(connection, senderPrivateKeyBase64) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const senderPrivateKeyBytes = buffer_1.Buffer.from(senderPrivateKeyBase64, 'base64');
            const senderKeypair = web3_js_1.Keypair.fromSecretKey(senderPrivateKeyBytes);
            const senderSOLAccountInfo = yield connection.getAccountInfo(senderKeypair.publicKey);
            if (!senderSOLAccountInfo) {
                console.error("Sender SOL account not found. Returning balance as 0.");
                return 0; // Return 0 if no account info is found
            }
            const solLamports = senderSOLAccountInfo.lamports;
            const solBalance = solLamports / Math.pow(10, 9); // Convert lamports to SOL
            return solBalance;
        }
        catch (error) {
            console.error("Error fetching SOL balance. Returning default value 0:", error);
            return 0; // Return 0 in case of any errors
        }
    });
}
exports.getSolBalance = getSolBalance;
// Example usage
