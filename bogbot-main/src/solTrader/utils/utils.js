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
function getBalancesAndRelativeValues(connection, senderPrivateKeyBase64, splTokenMintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const wSOL = 'So11111111111111111111111111111111111111112';
        const jupiterQuoteApi = (0, api_1.createJupiterApiClient)();
        const senderPrivateKeyBytes = buffer_1.Buffer.from(senderPrivateKeyBase64, 'base64');
        const senderKeypair = web3_js_1.Keypair.fromSecretKey(senderPrivateKeyBytes);
        const tokenMintPublicKey = new web3_js_1.PublicKey(splTokenMintAddress);
        let solBalance = 0;
        let splTokenBalance = 0;
        let relativeSol = 0;
        let relativeSplToken = 0;
        let totalValueInSol = 0;
        let solLamp = 0;
        let splLamp = 0;
        const maxRetries = 3;
        // Helper function to fetch SOL balance
        function fetchSolBalance() {
            return __awaiter(this, void 0, void 0, function* () {
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        const senderSOLAccountInfo = yield connection.getAccountInfo(senderKeypair.publicKey);
                        if (senderSOLAccountInfo) {
                            solLamp = senderSOLAccountInfo.lamports;
                            solBalance = solLamp / Math.pow(10, 9); // LAMPORTS_PER_SOL usually equals 10^9
                            return;
                        }
                    }
                    catch (error) {
                        console.error("Error fetching SOL balance:", error);
                        if (attempt === maxRetries - 1) {
                            solBalance = 0;
                        }
                        else {
                            yield new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
            });
        }
        // Helper function to fetch Token balance
        function fetchTokenBalance() {
            return __awaiter(this, void 0, void 0, function* () {
                const tokenDecimals = yield getTokenDecimals(connection, tokenMintPublicKey);
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        const senderTokenAccount = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, senderKeypair, tokenMintPublicKey, senderKeypair.publicKey);
                        const senderTokenAccountInfo = yield (0, spl_token_1.getAccount)(connection, senderTokenAccount.address);
                        if (senderTokenAccountInfo) {
                            splTokenBalance = Number(senderTokenAccountInfo.amount) / Math.pow(10, tokenDecimals);
                            splLamp = Number(senderTokenAccountInfo.amount);
                            return;
                        }
                    }
                    catch (error) {
                        console.error("Error fetching Token balance:", error);
                        if (attempt === maxRetries - 1) {
                            splTokenBalance = 0;
                        }
                        else {
                            yield new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                }
            });
        }
        // Fetch balances
        yield Promise.all([fetchSolBalance(), fetchTokenBalance()]);
        try {
            const quote = yield jupiterQuoteApi.quoteGet({
                inputMint: wSOL,
                outputMint: splTokenMintAddress,
                amount: 1000000000,
                slippageBps: 50,
                onlyDirectRoutes: false,
                asLegacyTransaction: false,
            });
            if (quote && quote.outAmount && quote.inAmount) {
                const SPLperSOL = Number(quote.outAmount);
                const LAMPperSPLLAMP = Number(quote.inAmount) / SPLperSOL;
                const splAsSolLamp = LAMPperSPLLAMP * splLamp;
                const tokenDecimals = yield getTokenDecimals(connection, tokenMintPublicKey);
                const totalLampValue = splAsSolLamp + solLamp;
                totalValueInSol = solBalance + (splTokenBalance * (Math.pow(10, 9) / Math.pow(10, tokenDecimals)));
                relativeSol = solLamp / totalLampValue;
                relativeSplToken = splAsSolLamp / totalLampValue;
            }
        }
        catch (error) {
            console.error("Error fetching quote:", error);
            // Errors are logged but not thrown, so function returns zeroed-out values gracefully
        }
        return {
            solBalance,
            splTokenBalance,
            relativeSol,
            relativeSplToken,
            totalValueInSol
        };
    });
}
exports.getBalancesAndRelativeValues = getBalancesAndRelativeValues;
function getTokenBalance(connection, senderPrivateKeyBase64, tokenMintAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const senderPrivateKeyBytes = buffer_1.Buffer.from(senderPrivateKeyBase64, 'base64');
            const senderKeypair = web3_js_1.Keypair.fromSecretKey(senderPrivateKeyBytes);
            const tokenMintPublicKey = new web3_js_1.PublicKey(tokenMintAddress);
            const associatedTokenAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(tokenMintPublicKey, senderKeypair.publicKey);
            // Fetch the token account details
            const tokenAccountInfo = yield (0, spl_token_1.getAccount)(connection, associatedTokenAddress);
            // Fetch the token decimals
            const decimals = yield getTokenDecimals(connection, tokenMintPublicKey);
            // Calculate and return the normalized balance
            const balance = tokenAccountInfo.amount;
            const normalizedBalance = Number(balance) / Math.pow(10, decimals);
            console.log(`Normalized token balance: ${normalizedBalance}`);
            return normalizedBalance;
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
