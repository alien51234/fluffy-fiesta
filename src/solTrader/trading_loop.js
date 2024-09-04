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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMongoClient = void 0;
// dbClient.ts - Singleton MongoDB Client
const mongodb_1 = require("mongodb");
const SolanaTrader_1 = __importDefault(require("./SolanaTrader"));
const web3_js_1 = require("@solana/web3.js");
require("isomorphic-fetch");
// Assuming db.js exports these as part of an object or multiple functions
const db2 = require('./db2.js');
const exec = require('./db2.js');
const uri = "mongodb+srv://Admin:admin@cluster0.g6rtlxh.mongodb.net/";
let client = null;
const dbName = 'newBot';
const collectionName = 'orders';
const execID = '1';
const connection = new web3_js_1.Connection('https://api.mainnet-beta.solana.com/', 'confirmed');
const orderFeerecipient = "8Bas8H1J7zKKDe1LSAUzbCchvLy6S7mCTWamdiV6DW67";
function getMongoClient() {
    const client = new mongodb_1.MongoClient(uri, {
        serverSelectionTimeoutMS: 30000
    });
    return client;
}
exports.getMongoClient = getMongoClient;
function getOrderEntry(orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        let client = null; // Initialize the client to null
        try {
            client = yield getMongoClient(); // Ensure MongoClient is instantiated
            const database = client.db(dbName);
            const orders = database.collection(collectionName);
            const order = yield orders.findOne({ _id: new mongodb_1.ObjectId(orderId) });
            if (order) {
                console.log('Order Found:', order);
                return order;
            }
            else {
                console.log('No order found with ID:', orderId);
                return null;
            }
        }
        catch (error) {
            console.error('Database operation failed:', error);
            return null; // Handle or re-throw the error as appropriate
        }
        finally {
            if (client) {
                yield client.close(); // Ensure the client is closed properly
            }
        }
    });
}
function createOrderEntry(client, order) {
    return __awaiter(this, void 0, void 0, function* () {
        const database = client.db(dbName);
        const orders = database.collection(collectionName);
        const result = yield orders.insertOne(order);
        console.log(`New order created with the following id: ${result.insertedId}`);
    });
}
function updateOrderEntry(orderId, updateData) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getMongoClient();
        const database = client.db(dbName); // Specify your DB name if different
        const orders = database.collection(collectionName); // Specify your collection name if different
        try {
            const updateResult = yield orders.updateOne({ _id: new mongodb_1.ObjectId(orderId) }, { $set: updateData });
            if (updateResult.matchedCount === 0) {
                console.log('No order found with ID:', orderId);
            }
            else if (updateResult.modifiedCount === 1) {
                console.log('Order updated successfully.');
            }
            else {
                console.log('Order was not updated.');
            }
        }
        catch (error) {
            console.error('Failed to update the order:', error);
        }
        finally {
            yield client.close(); // Close the MongoDB connection
        }
    });
}
function createNewOrder(client) {
    return __awaiter(this, void 0, void 0, function* () {
        const newKeypair = web3_js_1.Keypair.generate();
        const publicKey = newKeypair.publicKey.toBase58();
        const privateKey = Buffer.from(newKeypair.secretKey).toString('base64');
        const newOrder = {
            _id: new mongodb_1.ObjectId(), // MongoDB auto-generates a unique ID
            publicKey: publicKey,
            privateKey: privateKey,
            tokenAddress: token1,
            orderSize: 0.01,
            interval: 100,
            status: "waiting",
            statusBot: "starting"
        };
        yield createOrderEntry(client, newOrder);
        console.log('New order created with order ID:', newOrder._id);
    });
}
function createOrderExecEntry(orderExec) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getMongoClient();
        const database = client.db(dbName);
        const orderExecs = database.collection('orderExec');
        yield orderExecs.insertOne(orderExec);
        yield client.close();
    });
}
function getOrderExecEntry(orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getMongoClient();
        const database = client.db(dbName);
        const orderExecs = database.collection('orderExec');
        const orderExecDocument = yield orderExecs.findOne({ orderId: orderId });
        if (orderExecDocument) {
            console.log('OrderExec Found:', orderExecDocument);
            // Convert WithId<Document> to OrderExec
            const orderExec = {
                orderId: orderExecDocument.orderId,
                keyPairs: orderExecDocument.keyPairs,
                executerId: orderExecDocument.executerId
            };
            yield client.close();
            return orderExec;
        }
        else {
            console.log('No OrderExec found with ID:', orderId);
            yield client.close();
            return null;
        }
    });
}
function updateOrderExecEntry(orderId, newKeyPair) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = getMongoClient(); // Ensure you connect to the MongoDB client
        try {
            const database = client.db(dbName);
            const orderExecs = database.collection('orderExec');
            // Use the $push operator to add the new key pair to the keyPairs array
            const updateResult = yield orderExecs.updateOne({ orderId: orderId }, // Filter by orderId
            { $push: { keyPairs: newKeyPair } } // Append new keypair to the array
            );
            if (updateResult.matchedCount === 0) {
                console.log('No OrderExec found with ID:', orderId);
            }
            else if (updateResult.modifiedCount === 1) {
                console.log('OrderExec updated successfully.');
            }
            else {
                console.log('OrderExec was not updated.');
            }
        }
        catch (error) {
            console.error('Failed to update OrderExec entry:', error);
        }
        finally {
            yield client.close(); // Always close the client
        }
    });
}
function generateKeyPairs(amount) {
    return __awaiter(this, void 0, void 0, function* () {
        let keyPairs = [];
        for (let i = 0; i < amount; i++) {
            const keypair = web3_js_1.Keypair.generate();
            const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
            keyPairs.push(secretKeyBase64);
        }
        return keyPairs;
    });
}
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    });
}
function runTransactionLoop(orderId, connection) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // const orderData = await getOrderEntry(orderId);
            // if (!orderData) {
            //     throw new Error('Order not found');
            // }
            const orderDataRaw = yield db2.Order.get_order(orderId);
            if (!orderDataRaw) {
                throw new Error('Order not found');
            }
            console.log("order data:", orderDataRaw);
            let keyPairObjects = []; // This will store base64 encoded secret keys
            const orderData = orderDataRaw[0];
            const min = 30;
            const max = 40;
            console.log("private key:", orderData.private_key);
            const trader = new SolanaTrader_1.default(connection, orderData.private_key);
            console.log("token address:", orderData.token_address);
            const intialBalances = yield trader.relativeBalance(orderData.token_address);
            console.log("inital Balances", intialBalances);
            if (intialBalances.solBalance < orderData.order_size) {
                yield db2.Order.set_loop_status(orderData.session_id, "insufficent start balance");
                //updateOrderEntry(orderData._id, {statusBot: 'insufficent start balance'})
                return;
            }
            const orderExec = {
                orderId: orderData.session_id,
                keyPairs: keyPairObjects,
                executerId: execID
            };
            yield createOrderExecEntry(orderExec);
            yield trader.send(wSOL, orderFeerecipient, orderData.order_size * 0.2, false);
            const initialNextKeypair = web3_js_1.Keypair.generate();
            const initlaNextPrivateKeyBase64 = Buffer.from(initialNextKeypair.secretKey).toString('base64');
            console.log("new receiver:", initlaNextPrivateKeyBase64);
            // Add the newly generated base64 encoded secret key to the orderExec and update the database.
            orderExec.keyPairs.push(initlaNextPrivateKeyBase64);
            yield updateOrderExecEntry(orderData.session_id, initlaNextPrivateKeyBase64);
            const initialNextTrader = new SolanaTrader_1.default(connection, initlaNextPrivateKeyBase64);
            yield trader.send(wSOL, initialNextKeypair.publicKey.toBase58(), orderData.order_size * 0.8 - 0.005, false);
            console.log("Initial Balances:", yield trader.relativeBalance(orderData.token_address));
            function sendNext(trader) {
                return __awaiter(this, void 0, void 0, function* () {
                    const orderDataRaw = yield db2.Order.get_order(orderId);
                    const orderData = orderDataRaw[0];
                    if (!orderData) {
                        console.error('Order not found');
                        return;
                    }
                    if (orderData.cancelled_on == null) {
                        const intervalInSeconds = orderData.trade_interval_minutes;
                        const status = orderData.loop_status;
                        const tradePercentage = Math.floor(Math.random() * (max - min + 1)) + min;
                        console.log("orderData:", orderData.token_address);
                        const balanceDetails = yield trader.relativeBalance(orderData.token_address);
                        console.log("balance details:", balanceDetails);
                        if (!balanceDetails.solBalance) {
                            console.error('Failed to retrieve balance details.');
                            setTimeout(() => sendNext(trader), 6000);
                            return;
                        }
                        console.log("Balance details:", balanceDetails);
                        if (balanceDetails.solBalance / balanceDetails.relativeSol < 0.01 && balanceDetails.solBalance != 0 || balanceDetails.solBalance < 0.005) {
                            yield db2.Order.set_loop_status(orderData.session_id, "finished");
                            console.log("finished");
                            return;
                        }
                        let action;
                        if (balanceDetails.solBalance > 0.01) {
                            action = decideAction(balanceDetails.relativeSol, balanceDetails.relativeSplToken);
                        }
                        else {
                            action = 'sell';
                        }
                        if (action) {
                            let amountToTrade = (action === 'buy' ? balanceDetails.solBalance : balanceDetails.splTokenBalance) * (tradePercentage / 100);
                            amountToTrade = Math.min(amountToTrade, Number.MAX_SAFE_INTEGER);
                            console.log("Trade params:", orderData.token_address, action, amountToTrade);
                            const balanceTokenBeforeTrade = trader.balance(orderData.token_address);
                            try {
                                yield placeOrder(trader, orderData, action, amountToTrade);
                                console.log(`${action} trade executed.`);
                            }
                            catch (error) {
                                console.error('Trade execution failed:', error);
                            }
                        }
                        yield sleep(10000);
                        const newKeypair = web3_js_1.Keypair.generate();
                        const newPrivateKeyBase64 = Buffer.from(newKeypair.secretKey).toString('base64');
                        console.log("new receiver:", newPrivateKeyBase64);
                        const newPublicKey = newKeypair.publicKey.toBase58();
                        // Add the newly generated base64 encoded secret key to the orderExec and update the database.
                        orderExec.keyPairs.push(newPrivateKeyBase64);
                        yield updateOrderExecEntry(orderData.session_id, newPrivateKeyBase64);
                        yield exec.Execution.save(orderData.session_id, "0", "0", newPublicKey, newPrivateKeyBase64, orderData.order_size);
                        yield sendTokenAndVerify(trader, orderData, newPublicKey);
                        yield sendSolAndVerify(trader, orderData, newPublicKey);
                        const newTrader = new SolanaTrader_1.default(connection, newPrivateKeyBase64);
                        console.log("order interval", orderData.trade_interval_minutes * 1000 * 60);
                        setTimeout(() => sendNext(newTrader), orderData.trade_interval_minutes * 1000 * 60);
                    }
                    else {
                        setTimeout(() => sendNext(trader), 6000);
                    }
                });
            }
            sendNext(initialNextTrader);
        }
        catch (error) {
            console.error('Failed to execute transaction loop:', error);
            // Handle or rethrow error, potentially implementing a retry mechanism
        }
    });
}
function decideAction(relativeSol, relativeSplToken) {
    // Example decision logic
    console.log("deciding action");
    const lowerThreshold = 0.4; // 30%
    const upperThreshold = 0.5; // 70%
    if (relativeSol < lowerThreshold) {
        console.log("action sell");
        return 'sell';
    }
    else if (relativeSol > upperThreshold) {
        console.log("action buy");
        return 'buy';
    }
    return 'buy';
}
function sendTokenAndVerify(trader_1, orderData_1, newPublicKey_1) {
    return __awaiter(this, arguments, void 0, function* (trader, orderData, newPublicKey, retryCount = 0) {
        const tokenBalanceBefore = yield trader.balance(orderData.token_address);
        try {
            const amountToken = (yield trader.balance(orderData.token_address)) * 0.999;
            yield trader.send(orderData.token_address, newPublicKey, amountToken, false);
            console.log(`Tokens successfully sent to next account: ${newPublicKey}`);
        }
        catch (error) {
            console.error(`Failed to send tokens: ${error}`);
            if (retryCount >= 2) { // Adjusting to 2 because the initial call counts as the first attempt
                console.error("Maximum retry attempts reached. Exiting.");
                yield db2.Order.set_loop_status(orderData.session_id, "token transfer issue");
                return; // Stop retrying after 3 attempts
            }
            yield sleep(10000); // Wait for any transactions that might still settle
            // Recheck the balance to determine if the transaction eventually went through
            const tokenBalanceAfter = yield trader.balance(orderData.token_address);
            if (tokenBalanceAfter < tokenBalanceBefore) {
                console.log(`Tokens successfully forwarded to next account despite the error: ${newPublicKey}`);
            }
            else {
                console.error("No change in token balance detected, retrying...");
                setTimeout(() => sendTokenAndVerify(trader, orderData, newPublicKey, retryCount + 1), 6000);
            }
        }
    });
}
function placeOrder(trader_1, orderData_1, action_1, amountToTrade_1) {
    return __awaiter(this, arguments, void 0, function* (trader, orderData, action, amountToTrade, retryCount = 0) {
        try {
            // Attempt to place the order
            yield trader.newOrder(orderData.token_address, action === 'buy' ? "BUY" : "SELL", amountToTrade, 0.005);
            console.log(`${action.toUpperCase()} order attempted for ${amountToTrade}.`);
        }
        catch (error) {
            console.error(`Failed to place or verify ${action.toUpperCase()} order: ${error}`);
            if (retryCount >= 2) { // Allow up to 3 attempts
                console.error("Maximum retry attempts reached. Exiting.");
                yield db2.Order.set_loop_status(orderData.session_id, "order placement issue");
                return;
            }
            yield sleep(10000); // Wait before retrying
            console.log("Retrying order placement...");
            setTimeout(() => placeOrder(trader, orderData, action, amountToTrade * 0.5, retryCount + 1), 6000);
        }
    });
}
function sendSolAndVerify(trader_1, orderData_1, newPublicKey_1) {
    return __awaiter(this, arguments, void 0, function* (trader, orderData, newPublicKey, retryCount = 0) {
        var _a, _b;
        const solBalanceBefore = yield trader.balance(wSOL);
        let transactionSignature;
        try {
            transactionSignature = yield trader.send(wSOL, newPublicKey, solBalanceBefore * 0.85, true);
            console.log(`SOL successfully sent to next account: ${newPublicKey}. Transaction signature: ${transactionSignature}`);
            yield sleep(10000);
        }
        catch (error) {
            console.error(`Failed to send SOL: ${error}`);
            if (retryCount >= 2) {
                console.error("Maximum retry attempts reached. Exiting.");
                yield db2.Order.set_loop_status(orderData.session_id, "send SOL issue");
                return;
            }
            yield sleep(10000);
            // Recheck the balance to determine if the transaction eventually went through
            const solBalanceAfter = yield trader.balance(wSOL);
            if (solBalanceAfter < solBalanceBefore) {
                console.log(`SOL successfully forwarded to next account despite the error: ${newPublicKey}`);
                return;
            }
            else {
                console.error("No change in SOL balance detected, retrying...");
                yield sleep(6000);
                return sendSolAndVerify(trader, orderData, newPublicKey, retryCount + 1);
            }
        }
        // Confirm the transaction using Solana Explorer
        const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com");
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const status = yield connection.getSignatureStatus(transactionSignature);
                if (((_a = status === null || status === void 0 ? void 0 : status.value) === null || _a === void 0 ? void 0 : _a.confirmationStatus) === 'confirmed' || ((_b = status === null || status === void 0 ? void 0 : status.value) === null || _b === void 0 ? void 0 : _b.confirmationStatus) === 'finalized') {
                    console.log(`Transaction confirmed: ${transactionSignature}`);
                    return;
                }
            }
            catch (confirmationError) {
                console.error(`Error checking transaction status: ${confirmationError}`);
            }
            yield sleep(2000); // Wait before retrying to check the status
        }
        console.error("Transaction confirmation failed after multiple attempts.");
        if (retryCount < 2) {
            console.error("Retrying send operation...");
            yield sleep(6000);
            return sendSolAndVerify(trader, orderData, newPublicKey, retryCount + 1);
        }
        else {
            console.error("Maximum retry attempts reached for confirmation. Exiting.");
            yield db2.Order.set_loop_status(orderData.session_id, "send SOL issue");
        }
    });
}
function processActiveTradeOrders() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getMongoClient();
        const database = client.db(dbName);
        const ordersCollection = database.collection(collectionName);
        const openOrder = yield db2.Order.get_open();
        try {
            console.log(openOrder[0].session_id);
        }
        catch (_a) {
            console.log("no new orders");
        }
        try {
            // Find all orders with status 'active' and statusBot 'awaiting'
            const query = { status: "active", statusBot: "awaiting" };
            const orders = yield ordersCollection.find(query).toArray();
            // for (const order of orders) {
            //     // Now passing the full order object to runTradeLoop
            //     await updateOrderEntry(order._id, { statusBot: "running" });
            //     runTransactionLoop(order._id.toHexString(), connection);
            // }
            for (const order of openOrder) {
                // Now passing the full order object to runTradeLoop
                yield db2.Order.set_loop_status(order.session_id, "starting");
                runTransactionLoop(order.session_id, connection);
            }
        }
        catch (error) {
            console.error("Error processing active trade orders:", error);
        }
        finally {
            yield client.close(); // Ensure to close the MongoDB connection
        }
        yield client.close();
        setTimeout(processActiveTradeOrders, 60000);
    });
}
const privateKey1 = 'tjrvvz+8QqEDclRkGiC8xmAUZrZ/TC/V0tNdu3dq7oYWRCmGoepC3pOJf9saCk6j6HBmqtBn9Jyhlkm5jo2Xig==';
const reciver1 = 'FhU9qtRAR1Zhw6KRf3onPEb92vExVuRHikfAZ71dWwjg';
const amount1 = BigInt(566976);
const amount2 = BigInt(1000);
const token1 = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const wSOL = 'So11111111111111111111111111111111111111112';
const bpsStandard = 50;
//createNewOrder(getMongoClient()).catch(console.error);
processActiveTradeOrders();
