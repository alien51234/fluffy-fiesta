import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, AccountLayout , getAccount, getAssociatedTokenAddress} from '@solana/spl-token';
import { Buffer } from 'buffer';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createJupiterApiClient } from "@jup-ag/api";


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


export async function  getBalancesAndRelativeValues(senderPrivateKeyBase64: string, splTokenMintAddress: string) {
  const attemptFunction = async () => {
    const wSOL = 'So11111111111111111111111111111111111111112'
    const jupiterQuoteApi = createJupiterApiClient();
    const connection = new Connection('https://maximum-holy-arrow.solana-mainnet.quiknode.pro/61014782ec5a4688657111e0af0040634fdfeb19/', 'confirmed');
    const senderPrivateKeyBytes = Buffer.from(senderPrivateKeyBase64, 'base64');
    const senderKeypair = Keypair.fromSecretKey(senderPrivateKeyBytes);
    const tokenMintPublicKey = new PublicKey(splTokenMintAddress);

    // Fetch token decimals early as it is needed for calculations
    const tokenDecimals = await getTokenDecimals(connection, tokenMintPublicKey);

    try {
        const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            senderKeypair,
            tokenMintPublicKey,
            senderKeypair.publicKey
        );

        const senderTokenAccountInfo = await getAccount(connection, senderTokenAccount.address);
        let senderTokenBalance = 0; 
        let senderTokenLamp = 0;// Default to 0 if account info is not found

        if (senderTokenAccountInfo) {
            senderTokenBalance = Number(senderTokenAccountInfo.amount / BigInt(Math.pow(10, tokenDecimals)));
            senderTokenLamp = Number(senderTokenAccountInfo.amount)
        }

        const senderSOLAccountInfo = await connection.getAccountInfo(senderKeypair.publicKey);
        if (!senderSOLAccountInfo) {
            throw new Error("Sender SOL account not found.");
        }

        const quote = await jupiterQuoteApi.quoteGet({
            inputMint: wSOL,
            outputMint: splTokenMintAddress,
            amount: 1000000000,
            slippageBps: 50,
            onlyDirectRoutes:false,
            asLegacyTransaction: false,
          });


        const SPLperSOL = Number(quote.outAmount)  
        const LAMPperSPLLAMP =  Number(quote.inAmount)/SPLperSOL
        console.log(SPLperSOL, "SPL per SOL varibale")
        const solLamp = senderSOLAccountInfo.lamports;
        const splLamp = senderTokenLamp;
        const splAsSolLamp = LAMPperSPLLAMP * splLamp;
        const totalLampValue = splAsSolLamp + solLamp
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
            splLamp , // Keep lamports as numbers for consistency with original
            solLamp,
            tokenDecimals,
        };

    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
  }
   return withRetry(attemptFunction);
}

export async function getTokenBalance(
    connection: Connection,
    senderPrivateKeyBase64: string,
    tokenMintAddress: string
  ): Promise<number> {
    try {
      
      const senderPrivateKeyBytes = Buffer.from(senderPrivateKeyBase64, 'base64');
      const senderKeypair = Keypair.fromSecretKey(senderPrivateKeyBytes);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        new PublicKey(tokenMintAddress),
        senderKeypair.publicKey
      );
  
      // Fetch the token account details
      const tokenAccountInfo = await getAccount(connection, associatedTokenAddress);
  
      // Return the token balance as a number
      return Number(tokenAccountInfo.amount);
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

