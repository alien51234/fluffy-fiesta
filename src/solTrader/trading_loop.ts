// dbClient.ts - Singleton MongoDB Client
import { MongoClient, WithId, Document, ObjectId } from 'mongodb';
import SolanaTrader from './SolanaTrader';
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { assert } from 'console';
import 'isomorphic-fetch';


// Define the TypeScript interface for the Execution method
interface Execution {
    save: (
      session_id: string,
      from_public_address: string,
      from_private_key: string,
      to_public_address: string,
      to_private_key: string,
      order_size: number,
    ) => Promise<any>;
  }
  
// Define the structure of the module being imported
interface DbModuleExec {
    Execution: Execution;
}
  
  
interface Order {
    save_wallet: (session_id: string, wallet: string) => Promise<void>;
    update_wallet: (session_id: string, wallet: string) => Promise<any>;
    update_keys: (session_id: string, private_key: string, public_address: string) => Promise<any>;
    update_wallet_amount: (session_id: string, amount: number) => Promise<any>;
    update_order_size: (session_id: string, amount: number) => Promise<any>;
    start_trading: (session_id: string, interval: number) => Promise<any>;
    stop_trading: (session_id: string) => Promise<any>;
    cancel: (session_id: string) => Promise<any>;
    get_open: () => Promise<any>; // Note that there is no session_id parameter here
    get_order: (session_id: string) => Promise<any>;
    set_loop_status: (session_id: string, status: string) => Promise<any>;
}

interface DbModule {
    Order: Order;
}
  
  // Assuming db.js exports these as part of an object or multiple functions
  const db2: DbModule = require('./db2.js');
  const exec: DbModuleExec = require('./db2.js')
  


const uri = "mongodb+srv://Admin:admin@cluster0.g6rtlxh.mongodb.net/";
let client: MongoClient | null = null;
const dbName = 'newBot';
const collectionName = 'orders';
const execID = '1'
const connection = new Connection('https://api.mainnet-beta.solana.com/', 'confirmed');
const orderFeerecipient = "8Bas8H1J7zKKDe1LSAUzbCchvLy6S7mCTWamdiV6DW67"

export function getMongoClient(): MongoClient {
    
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 30000 
      });
    
    return client;
  }

interface TradeOrder {
    _id : ObjectId
    publicKey: string;
    privateKey: string;
    tokenAddress: string;
    orderSize: number;
    interval: number;
    status: string;
    statusBot: string;
}

interface OrderExec {
    orderId: ObjectId;
    keyPairs: string[];
    executerId: string;
}



async function getOrderEntry(orderId: string): Promise<TradeOrder | null> {
    let client: MongoClient | null = null;  // Initialize the client to null
    try {
        client = await getMongoClient();  // Ensure MongoClient is instantiated
        const database = client.db(dbName);
        const orders = database.collection(collectionName);
        const order = await orders.findOne({ _id: new ObjectId(orderId) }) as TradeOrder;
        if (order) {
            console.log('Order Found:', order);
            return order;
        } else {
            console.log('No order found with ID:', orderId);
            return null;
        }
    } catch (error) {
        console.error('Database operation failed:', error);
        return null; // Handle or re-throw the error as appropriate
    } finally {
        if (client) {
            await client.close();  // Ensure the client is closed properly
        }
    }
}


async function createOrderEntry(client: MongoClient, order: TradeOrder) {
    const database = client.db(dbName);
    const orders = database.collection(collectionName);
    const result = await orders.insertOne(order);
    console.log(`New order created with the following id: ${result.insertedId}`);
}

async function updateOrderEntry(orderId: ObjectId, updateData: Partial<TradeOrder>): Promise<void> {
    const client = await getMongoClient();
    const database = client.db(dbName);  // Specify your DB name if different
    const orders = database.collection<TradeOrder>(collectionName);  // Specify your collection name if different

    try {
        const updateResult = await orders.updateOne(
            { _id: new ObjectId(orderId) },
            { $set: updateData }
        );

        if (updateResult.matchedCount === 0) {
            console.log('No order found with ID:', orderId);
        } else if (updateResult.modifiedCount === 1) {
            console.log('Order updated successfully.');
        } else {
            console.log('Order was not updated.');
        }
    } catch (error) {
        console.error('Failed to update the order:', error);
    } finally {
        await client.close();  // Close the MongoDB connection
    }
}

async function createNewOrder(client: MongoClient) {
    const newKeypair = Keypair.generate();
    const publicKey = newKeypair.publicKey.toBase58();
    const privateKey = Buffer.from(newKeypair.secretKey).toString('base64');
    const newOrder = {
        _id: new ObjectId(),  // MongoDB auto-generates a unique ID
        publicKey: publicKey,
        privateKey: privateKey,
        tokenAddress: token1,
        orderSize: 0.01,
        interval: 100,
        status: "waiting",
        statusBot: "starting"
    };
    await createOrderEntry(client, newOrder);
    console.log('New order created with order ID:', newOrder._id);
}


async function createOrderExecEntry(orderExec: OrderExec): Promise<void> {
    const client =  await getMongoClient();
    const database = client.db(dbName);
    const orderExecs = database.collection('orderExec');
    await orderExecs.insertOne(orderExec);
    await client.close()
}

async function getOrderExecEntry(orderId: string): Promise<OrderExec | null> {
    const client = await getMongoClient();
    const database = client.db(dbName);
    const orderExecs = database.collection('orderExec');
    const orderExecDocument = await orderExecs.findOne<WithId<Document>>({ orderId: orderId });

    if (orderExecDocument) {
        console.log('OrderExec Found:', orderExecDocument);
        // Convert WithId<Document> to OrderExec
        const orderExec: OrderExec = {
            orderId: orderExecDocument.orderId,
            keyPairs: orderExecDocument.keyPairs,
            executerId: orderExecDocument.executerId
        };
        await client.close()
        return orderExec;
    } else {
        console.log('No OrderExec found with ID:', orderId);
        await client.close()
        return null;
    }
}
async function updateOrderExecEntry(orderId: ObjectId, newKeyPair: string): Promise<void> {
    const client =  getMongoClient();  // Ensure you connect to the MongoDB client
    try {
        const database = client.db(dbName);
        const orderExecs = database.collection<OrderExec>('orderExec');

        // Use the $push operator to add the new key pair to the keyPairs array
        const updateResult = await orderExecs.updateOne(
            { orderId: orderId },  // Filter by orderId
            { $push: { keyPairs: newKeyPair } }  // Append new keypair to the array
        );

        if (updateResult.matchedCount === 0) {
            console.log('No OrderExec found with ID:', orderId);
        } else if (updateResult.modifiedCount === 1) {
            console.log('OrderExec updated successfully.');
        } else {
            console.log('OrderExec was not updated.');
        }
    } catch (error) {
        console.error('Failed to update OrderExec entry:', error);
    } finally {
        await client.close();  // Always close the client
    }
}

async function generateKeyPairs(amount: number): Promise<Array<string>> {
    let keyPairs = [];
    for (let i = 0; i < amount; i++) {
        const keypair = Keypair.generate();
        const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
        keyPairs.push(secretKeyBase64);
    }
    return keyPairs;
}

async function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}


async function runTransactionLoop(orderId: string, connection: Connection) {
    try {
        // const orderData = await getOrderEntry(orderId);
        // if (!orderData) {
        //     throw new Error('Order not found');
        // }

        const orderDataRaw= await db2.Order.get_order(orderId);
        if (!orderDataRaw) {
            throw new Error('Order not found');
        }
        console.log("order data:", orderDataRaw)
        let keyPairObjects: string[] = [];  // This will store base64 encoded secret keys

        const orderData = orderDataRaw[0];




        const min = 30;
        const max = 40;
        console.log("private key:",  orderData.private_key);
        const trader = new SolanaTrader(connection, orderData.private_key);
        console.log("token address:", orderData.token_address);
        const intialBalances = await trader.relativeBalance(orderData.token_address);
        console.log("inital Balances", intialBalances)

        if (intialBalances.solBalance < orderData.order_size){
            await db2.Order.set_loop_status(orderData.session_id, "insufficent start balance")
            //updateOrderEntry(orderData._id, {statusBot: 'insufficent start balance'})
            return
        }

        const orderExec: OrderExec = {
            orderId: orderData.session_id,
            keyPairs: keyPairObjects,
            executerId: execID
        };
        await createOrderExecEntry(orderExec);
        
        await trader.send(wSOL, orderFeerecipient, orderData.order_size *0.2, false);

        const initialNextKeypair = Keypair.generate();
        const initlaNextPrivateKeyBase64 = Buffer.from(initialNextKeypair.secretKey).toString('base64');
        console.log("new receiver:", initlaNextPrivateKeyBase64);

        
        // Add the newly generated base64 encoded secret key to the orderExec and update the database.
        orderExec.keyPairs.push(initlaNextPrivateKeyBase64);
        await updateOrderExecEntry(orderData.session_id, initlaNextPrivateKeyBase64);
        const initialNextTrader = new SolanaTrader(connection, initlaNextPrivateKeyBase64);

        await trader.send(wSOL, initialNextKeypair.publicKey.toBase58(), orderData.order_size*0.8 - 0.005, false);


        console.log("Initial Balances:", await trader.relativeBalance(orderData.token_address));

        async function sendNext(trader: SolanaTrader) {
            const orderDataRaw = await db2.Order.get_order(orderId);
            const orderData = orderDataRaw[0];
            if (!orderData) {
                console.error('Order not found');
                return;
            }

            if(orderData.cancelled_on == null){
                const intervalInSeconds =  orderData.trade_interval_minutes
                const status = orderData.loop_status
                const tradePercentage = Math.floor(Math.random() * (max - min + 1)) + min;
                console.log("orderData:", orderData.token_address)
                const balanceDetails = await trader.relativeBalance(orderData.token_address);

                console.log("balance details:", balanceDetails)

                if (!balanceDetails.solBalance) {
                    console.error('Failed to retrieve balance details.');
                    setTimeout(() => sendNext(trader), 6000);
                    return;
                }

                console.log("Balance details:", balanceDetails);
                if(balanceDetails.solBalance/balanceDetails.relativeSol < 0.01 && balanceDetails.solBalance != 0 || balanceDetails.solBalance < 0.005){
                    await db2.Order.set_loop_status(orderData.session_id, "finished")
                    console.log("finished")
                    return;

                }
                let action
                if(balanceDetails.solBalance>0.01){
                     action = decideAction(balanceDetails.relativeSol, balanceDetails.relativeSplToken);
                }else{
                    action = 'sell';
                }
                

                if (action) {
                    let amountToTrade = (action === 'buy' ? balanceDetails.solBalance : balanceDetails.splTokenBalance) * (tradePercentage / 100);
                    amountToTrade = Math.min(amountToTrade, Number.MAX_SAFE_INTEGER);

                    console.log("Trade params:", orderData.token_address, action, amountToTrade);
                    const balanceTokenBeforeTrade = trader.balance(orderData.token_address);
                    try {
                        await placeOrder(trader, orderData, action as 'buy' | 'sell', amountToTrade);
                        
                        console.log(`${action} trade executed.`);
                    } catch (error) {
                        console.error('Trade execution failed:', error);
                    }
                }

                await sleep(10000);

                const newKeypair = Keypair.generate();
                const newPrivateKeyBase64 = Buffer.from(newKeypair.secretKey).toString('base64');
                console.log("new receiver:", newPrivateKeyBase64);
                const newPublicKey = newKeypair.publicKey.toBase58();

                // Add the newly generated base64 encoded secret key to the orderExec and update the database.
                orderExec.keyPairs.push(newPrivateKeyBase64);
                await updateOrderExecEntry(orderData.session_id, newPrivateKeyBase64);

                await exec.Execution.save(orderData.session_id,"0", "0", newPublicKey, newPrivateKeyBase64, orderData.order_size);
                
                await sendTokenAndVerify(trader, orderData, newPublicKey);
                await sendSolAndVerify(trader,orderData, newPublicKey); 

                const newTrader = new SolanaTrader(connection, newPrivateKeyBase64);
                console.log("order interval" , orderData.trade_interval_minutes*1000 * 60);
                setTimeout(() => sendNext(newTrader), orderData.trade_interval_minutes * 1000 * 60);

            }else{
                setTimeout(() => sendNext(trader), 6000);
            }
            
            
        }

        sendNext(initialNextTrader);
    }catch (error) {
        console.error('Failed to execute transaction loop:', error);
        // Handle or rethrow error, potentially implementing a retry mechanism
    }  
}



function decideAction(relativeSol: number, relativeSplToken: number) {
    // Example decision logic
    console.log("deciding action")
    const lowerThreshold = 0.4; // 30%
    const upperThreshold = 0.5; // 70%
    if (relativeSol < lowerThreshold) {
        console.log("action sell")
        return 'sell';
    } else if (relativeSol > upperThreshold) {
        console.log("action buy")
        return 'buy';
    }
    return 'buy';
}
async function sendTokenAndVerify(trader: SolanaTrader, orderData: any, newPublicKey:string, retryCount = 0) {
    const tokenBalanceBefore = await trader.balance(orderData.token_address);
    try {
        const amountToken = (await trader.balance(orderData.token_address)) * 0.999;
        
        await trader.send(orderData.token_address, newPublicKey, amountToken, false);
        console.log(`Tokens successfully sent to next account: ${newPublicKey}`);
    } catch (error) {
        console.error(`Failed to send tokens: ${error}`);
        if (retryCount >= 2) {  // Adjusting to 2 because the initial call counts as the first attempt
            console.error("Maximum retry attempts reached. Exiting.");
            await db2.Order.set_loop_status(orderData.session_id, "token transfer issue")
            return;  // Stop retrying after 3 attempts
        }
        
        await sleep(10000);  // Wait for any transactions that might still settle

        // Recheck the balance to determine if the transaction eventually went through
        const tokenBalanceAfter = await trader.balance(orderData.token_address);
        if (tokenBalanceAfter < tokenBalanceBefore) {
            console.log(`Tokens successfully forwarded to next account despite the error: ${newPublicKey}`);
        } else {
            console.error("No change in token balance detected, retrying...");
            setTimeout(() => sendTokenAndVerify(trader, orderData, newPublicKey, retryCount + 1), 6000);
        }
    }
}

async function placeOrder(trader: SolanaTrader, orderData: any, action: 'buy' | 'sell', amountToTrade: number, retryCount = 0) {
    try {
        // Attempt to place the order
        await trader.newOrder(orderData.token_address, action === 'buy' ? "BUY" : "SELL", amountToTrade, 0.005);
        console.log(`${action.toUpperCase()} order attempted for ${amountToTrade}.`);

    } catch (error) {
        console.error(`Failed to place or verify ${action.toUpperCase()} order: ${error}`);
        if (retryCount >= 2) { // Allow up to 3 attempts
            console.error("Maximum retry attempts reached. Exiting.");
            await db2.Order.set_loop_status(orderData.session_id, "order placement issue")
            return;
        }

        await sleep(10000); // Wait before retrying
        console.log("Retrying order placement...");
        setTimeout(() => placeOrder(trader, orderData, action, amountToTrade * 0.5, retryCount + 1), 6000);
    }
}



async function sendSolAndVerify(trader: SolanaTrader, orderData: any, newPublicKey: string, retryCount = 0) {
    const solBalanceBefore = await trader.balance(wSOL);
    let transactionSignature;

    try {
        transactionSignature = await trader.send(wSOL, newPublicKey, solBalanceBefore * 0.85, true);
        console.log(`SOL successfully sent to next account: ${newPublicKey}. Transaction signature: ${transactionSignature}`);
        await sleep(10000);
    } catch (error) {
        console.error(`Failed to send SOL: ${error}`);
        if (retryCount >= 2) {
            console.error("Maximum retry attempts reached. Exiting.");
            await db2.Order.set_loop_status(orderData.session_id, "send SOL issue");
            return;
        }

        await sleep(10000);

        // Recheck the balance to determine if the transaction eventually went through
        const solBalanceAfter = await trader.balance(wSOL);
        if (solBalanceAfter < solBalanceBefore) {
            console.log(`SOL successfully forwarded to next account despite the error: ${newPublicKey}`);
            return;
        } else {
            console.error("No change in SOL balance detected, retrying...");
            await sleep(6000);
            return sendSolAndVerify(trader, orderData, newPublicKey, retryCount + 1);
        }
    }

    // Confirm the transaction using Solana Explorer
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const status = await connection.getSignatureStatus(transactionSignature);
            if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
                console.log(`Transaction confirmed: ${transactionSignature}`);
                return;
            }
        } catch (confirmationError) {
            console.error(`Error checking transaction status: ${confirmationError}`);
        }
        await sleep(2000); // Wait before retrying to check the status
    }

    console.error("Transaction confirmation failed after multiple attempts.");
    if (retryCount < 2) {
        console.error("Retrying send operation...");
        await sleep(6000);
        return sendSolAndVerify(trader, orderData, newPublicKey, retryCount + 1);
    } else {
        console.error("Maximum retry attempts reached for confirmation. Exiting.");
        await db2.Order.set_loop_status(orderData.session_id, "send SOL issue");
    }
}


async function processActiveTradeOrders() {
    const client = await getMongoClient();
    const database = client.db(dbName);
    const ordersCollection = database.collection<TradeOrder>(collectionName);
    const openOrder = await db2.Order.get_open()
    try {
        console.log(openOrder[0].session_id)
    }catch{
        console.log("no new orders")
    }
   

    try {
        // Find all orders with status 'active' and statusBot 'awaiting'
        const query = { status: "active", statusBot: "awaiting" };
        const orders = await ordersCollection.find(query).toArray();

        // for (const order of orders) {
        //     // Now passing the full order object to runTradeLoop
        //     await updateOrderEntry(order._id, { statusBot: "running" });
        //     runTransactionLoop(order._id.toHexString(), connection);

        // }
        for (const order of openOrder) {
            // Now passing the full order object to runTradeLoop
            await db2.Order.set_loop_status(order.session_id, "starting");
            runTransactionLoop(order.session_id, connection);

        }


    } catch (error) {
        console.error("Error processing active trade orders:", error);
    } finally {
        await client.close(); // Ensure to close the MongoDB connection
    }
    await client.close();
    setTimeout(processActiveTradeOrders, 60000);
}







const privateKey1 = 'tjrvvz+8QqEDclRkGiC8xmAUZrZ/TC/V0tNdu3dq7oYWRCmGoepC3pOJf9saCk6j6HBmqtBn9Jyhlkm5jo2Xig=='
const reciver1 = 'FhU9qtRAR1Zhw6KRf3onPEb92vExVuRHikfAZ71dWwjg'
const amount1 = BigInt(566976)
const amount2 = BigInt(1000)
const token1 = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const wSOL = 'So11111111111111111111111111111111111111112'
const bpsStandard = 50

//createNewOrder(getMongoClient()).catch(console.error);
processActiveTradeOrders()