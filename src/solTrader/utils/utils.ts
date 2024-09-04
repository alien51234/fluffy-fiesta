import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, AccountLayout , getAccount, getAssociatedTokenAddress} from '@solana/spl-token';
import { Buffer } from 'buffer';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createJupiterApiClient } from "@jup-ag/api";
import fetch from 'cross-fetch';


async function getTokenDecimals(connection: Connection, mintAddress: PublicKey): Promise<number> {
    const info = await connection.getParsedAccountInfo(mintAddress);
    if (info.value && info.value.data && "parsed" in info.value.data) {
        return info.value.data.parsed.info.decimals;
    } else {
        throw new Error("Failed to retrieve or parse token decimals.");
    }
}

async function withRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
          return await fn();
      } catch (error) {
          if (attempt === retries) {
              console.error('Final attempt failed:', error);
              throw error;
          }
          console.log(`Attempt ${attempt} failed, retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
      }
  }
  throw new Error('withRetry exhausted all attempts');
}




export async function getBalancesAndRelativeValues(connection: Connection, senderPrivateKeyBase64: string, splTokenMintAddress: string) {
    const wSOL = 'So11111111111111111111111111111111111111112';
    const jupiterQuoteApi = createJupiterApiClient();
    const senderPrivateKeyBytes = Buffer.from(senderPrivateKeyBase64, 'base64');
    const senderKeypair = Keypair.fromSecretKey(senderPrivateKeyBytes);
    const tokenMintPublicKey = new PublicKey(splTokenMintAddress);

    let solBalance = 0;
    let splTokenBalance = 0;
    let relativeSol = 0;
    let relativeSplToken = 0;
    let totalValueInSol = 0;
    let solLamp = 0;
    let splLamp = 0;

    const maxRetries = 3;

    // Helper function to fetch SOL balance
    async function fetchSolBalance() {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const senderSOLAccountInfo = await connection.getAccountInfo(senderKeypair.publicKey);
                if (senderSOLAccountInfo) {
                    solLamp = senderSOLAccountInfo.lamports;
                    solBalance = solLamp / Math.pow(10, 9); // LAMPORTS_PER_SOL usually equals 10^9
                    return;
                }
            } catch (error) {
                console.error("Error fetching SOL balance:", error);
                if (attempt === maxRetries - 1) {
                    solBalance = 0;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    }

    // Helper function to fetch Token balance
    async function fetchTokenBalance() {
        const tokenDecimals = await getTokenDecimals(connection, tokenMintPublicKey);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const senderTokenAccount = await getOrCreateAssociatedTokenAccount(connection, senderKeypair, tokenMintPublicKey, senderKeypair.publicKey);
                const senderTokenAccountInfo = await getAccount(connection, senderTokenAccount.address);
                if (senderTokenAccountInfo) {
                    splTokenBalance = Number(senderTokenAccountInfo.amount) / Math.pow(10, tokenDecimals);
                    splLamp = Number(senderTokenAccountInfo.amount);
                    return;
                }
            } catch (error) {
                console.error("Error fetching Token balance:", error);
                if (attempt === maxRetries - 1) {
                    splTokenBalance = 0;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    }

    // Fetch balances
    await Promise.all([fetchSolBalance(), fetchTokenBalance()]);

    try {
        const quote = await jupiterQuoteApi.quoteGet({
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
            const tokenDecimals = await getTokenDecimals(connection, tokenMintPublicKey);

            const totalLampValue = splAsSolLamp + solLamp;
            totalValueInSol = solBalance + (splTokenBalance * (Math.pow(10, 9) / Math.pow(10, tokenDecimals)));
            relativeSol = solLamp / totalLampValue;
            relativeSplToken = splAsSolLamp / totalLampValue;
        }
    } catch (error) {
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
}



export async function getTokenBalance(
  connection: Connection,
  senderPrivateKeyBase64: string,
  tokenMintAddress: string
): Promise<number> {
  try {
      const senderPrivateKeyBytes = Buffer.from(senderPrivateKeyBase64, 'base64');
      const senderKeypair = Keypair.fromSecretKey(senderPrivateKeyBytes);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);
      const associatedTokenAddress = await getAssociatedTokenAddress(tokenMintPublicKey, senderKeypair.publicKey);

      // Fetch the token account details
      const tokenAccountInfo = await getAccount(connection, associatedTokenAddress);

      // Fetch the token decimals
      const decimals = await getTokenDecimals(connection, tokenMintPublicKey);

      // Calculate and return the normalized balance
      const balance = tokenAccountInfo.amount;
      const normalizedBalance = Number(balance) / Math.pow(10, decimals);

      console.log(`Normalized token balance: ${normalizedBalance}`);
      return normalizedBalance;
  } catch (error) {
      console.error('Failed to get token balance:', error);
      return 0;
  }
}
  
export async function getSolBalance(connection: Connection, senderPrivateKeyBase64: string): Promise<number> {
  
  try {
    const senderPrivateKeyBytes = Buffer.from(senderPrivateKeyBase64, 'base64');
    const senderKeypair = Keypair.fromSecretKey(senderPrivateKeyBytes);
  
    const senderSOLAccountInfo = await connection.getAccountInfo(senderKeypair.publicKey);
    if (!senderSOLAccountInfo) {
      console.error("Sender SOL account not found. Returning balance as 0.");
      return 0; // Return 0 if no account info is found
    }
  
    const solLamports = senderSOLAccountInfo.lamports;
    const solBalance = solLamports / Math.pow(10, 9); // Convert lamports to SOL
    return solBalance;
  } catch (error) {
    console.error("Error fetching SOL balance. Returning default value 0:", error);
    return 0; // Return 0 in case of any errors
  }
}
  
// Example usage

