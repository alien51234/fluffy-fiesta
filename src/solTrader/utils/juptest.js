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
// Polyfill for fetch
const jupiterQuoteApi = (0, api_1.createJupiterApiClient)(); // No arguments needed if using default endpoint
function getQuote() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const quote = yield jupiterQuoteApi.quoteGet({
                inputMint: "So11111111111111111111111111111111111111112",
                outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                amount: 100000000,
                // platformFeeBps: 10,
                // asLegacyTransaction: true, // legacy transaction, default is versioned transaction
            });
            return quote;
        }
        catch (error) {
            console.error("Error fetching quote:", error);
            return null;
        }
    });
}
function output() {
    return __awaiter(this, void 0, void 0, function* () {
        const quote = yield getQuote();
        console.log("output", quote);
    });
}
output(); // Call the function to execute it
