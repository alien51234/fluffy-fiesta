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
const TradeExecutor_1 = __importDefault(require("./TradeExecutor"));
const SOLTransfer_1 = __importDefault(require("./SOLTransfer"));
const TokenSender_1 = __importDefault(require("./TokenSender"));
const utils_1 = require("./utils/utils");
class SolanaTrader {
    constructor(connection, senderPrivateKeyBase64) {
        this.solAddress = 'So11111111111111111111111111111111111111112';
        this.long = "BUY";
        this.connection = connection;
        this.senderPrivateKeyBase64 = senderPrivateKeyBase64;
        this.tradeExecutor = new TradeExecutor_1.default(connection, senderPrivateKeyBase64);
        this.solTransfer = new SOLTransfer_1.default(connection, senderPrivateKeyBase64);
        this.tokenSender = new TokenSender_1.default(connection, senderPrivateKeyBase64);
    }
    // Example method that uses the TradeExecutor to execute a trade
    newOrder(tokenMintAddress, side, realAmount, slippageRate) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("recived params:", tokenMintAddress, side, realAmount, slippageRate);
            const realAmount2 = parseFloat(realAmount.toFixed(6));
            if (side === this.long) {
                return yield this.tradeExecutor.executeTrade(this.solAddress, tokenMintAddress, realAmount2, slippageRate);
            }
            else {
                return yield this.tradeExecutor.executeTrade(tokenMintAddress, this.solAddress, realAmount2, slippageRate);
            }
        });
    }
    send(tokenMintAddress, recipientAddress, quantity, useMax) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("try Transfer, data: ", tokenMintAddress, recipientAddress, quantity, useMax);
            if (tokenMintAddress === this.solAddress) {
                return yield this.solTransfer.sendSOL(recipientAddress, quantity, useMax);
            }
            else {
                return yield this.tokenSender.sendToken(tokenMintAddress, recipientAddress, quantity, useMax);
            }
        });
    }
    balance(tokenMintAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tokenMintAddress === this.solAddress) {
                return yield (0, utils_1.getSolBalance)(this.connection, this.senderPrivateKeyBase64);
            }
            else {
                return yield (0, utils_1.getTokenBalance)(this.connection, this.senderPrivateKeyBase64, tokenMintAddress);
            }
        });
    }
    relativeBalance(tokenMintAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, utils_1.getBalancesAndRelativeValues)(this.connection, this.senderPrivateKeyBase64, tokenMintAddress);
        });
    }
    //seprate fucntions old
    //combinned above
    //Example method that uses the TokenTransfer to transfer tokens
    sendSOl(recipientAddress, amount, useMax) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.solTransfer.sendSOL(recipientAddress, amount, useMax);
        });
    }
    // Example method that uses the TokenSender to send SPL tokens
    sendToken(tokenMintAddress, recipientAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.tokenSender.sendToken(tokenMintAddress, recipientAddress, amount, false);
        });
    }
    SolBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, utils_1.getSolBalance)(this.connection, this.senderPrivateKeyBase64);
        });
    }
    TokenBalance(tokenMintAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, utils_1.getTokenBalance)(this.connection, this.senderPrivateKeyBase64, tokenMintAddress);
        });
    }
    executeTrade(inToken, outToken, realAmount, slippageRate) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.tradeExecutor.executeTrade(inToken, outToken, realAmount, slippageRate);
        });
    }
}
exports.default = SolanaTrader;
