import  TradeExecutor  from './TradeExecutor';
import  SOLTranfer  from './SOLTransfer';
import  TokenSender  from './TokenSender';
import { getTokenBalance, getSolBalance} from './utils/utils';
import { Connection } from '@solana/web3.js';
import { WSOL } from '@raydium-io/raydium-sdk';

class SolanaTrader {
    private tradeExecutor: TradeExecutor;
    private solTransfer: SOLTranfer;
    private tokenSender: TokenSender;
    private endpoint: string;
    private connection : Connection;
    private senderPrivateKeyBase64: string;

    constructor(endpoint: string, senderPrivateKeyBase64: string) {
        this.endpoint = endpoint;
        this.connection = new Connection(endpoint, 'confirmed');
        this.senderPrivateKeyBase64 = senderPrivateKeyBase64;
        this.tradeExecutor = new TradeExecutor(endpoint, senderPrivateKeyBase64);
        this.solTransfer = new SOLTranfer(endpoint, senderPrivateKeyBase64);
        this.tokenSender = new TokenSender(endpoint, senderPrivateKeyBase64);

    }
    solAddress: string = 'So11111111111111111111111111111111111111112'
    long: string = "BUY"

    // Example method that uses the TradeExecutor to execute a trade

    public async newOrder(tokenMintAddress: string, side: string, realAmount: number, slippageRate:number ){
        if(side === this.long){
            return await this.tradeExecutor.executeTrade(this.solAddress, tokenMintAddress, realAmount, slippageRate);
        }else{
            return await this.tradeExecutor.executeTrade(tokenMintAddress, this.solAddress, realAmount, slippageRate);
        }
    }

    public async send(tokenMintAddress:string, recipientAddress: string, quantity: bigint, useMax: boolean){
        if (tokenMintAddress === this.solAddress){
            return await this.solTransfer.sendSOL(recipientAddress, quantity, useMax)
        }
        else{
            return await this.tokenSender.sendToken(tokenMintAddress, recipientAddress, quantity, useMax);
        }    
    }

    public async balance(tokenMintAddress:string){
        if (tokenMintAddress === this.solAddress){
            return await getSolBalance(this.connection, this.senderPrivateKeyBase64)
        }
        else{
            return await getTokenBalance(this.connection, this.senderPrivateKeyBase64,tokenMintAddress)
        }   
    }





    //seprate fucntions old
    //combinned above
    // Example method that uses the TokenTransfer to transfer tokens
    public async sendSOl(recipientAddress: string, amount: bigint, useMax: boolean) {
        return await this.solTransfer.sendSOL( recipientAddress, amount, useMax);
    }

    // Example method that uses the TokenSender to send SPL tokens
    public async sendToken(tokenMintAddress: string, recipientAddress: string, amount: bigint) {
        return await this.tokenSender.sendToken(tokenMintAddress, recipientAddress, amount, false);
    }

    public async SolBalance(){
        return await getSolBalance(this.connection, this.senderPrivateKeyBase64)
    }

    public async TokenBalance(tokenMintAddress:string){
        return await getTokenBalance(this.connection, this.senderPrivateKeyBase64,tokenMintAddress)
    }
    public async executeTrade(inToken: string, outToken: string, realAmount: number, slippageRate: number) {
        return await this.tradeExecutor.executeTrade(inToken, outToken, realAmount, slippageRate);
    }
}

export default SolanaTrader;
