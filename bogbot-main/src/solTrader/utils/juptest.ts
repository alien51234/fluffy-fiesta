import { createJupiterApiClient } from '@jup-ag/api';
import fetch from 'cross-fetch';

// Polyfill for fetch


const jupiterQuoteApi = createJupiterApiClient(); // No arguments needed if using default endpoint

async function getQuote() {
    try {
        const quote = await jupiterQuoteApi.quoteGet({
            inputMint: "So11111111111111111111111111111111111111112",
            outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            amount: 100000000,
            // platformFeeBps: 10,
            // asLegacyTransaction: true, // legacy transaction, default is versioned transaction
        });
        return quote;
    } catch (error) {
        console.error("Error fetching quote:", error);
        return null;
    }
}

async function output() {
    const quote = await getQuote();
    console.log("output", quote);
}

output(); // Call the function to execute it
