var pool = require('./pg-oc.js').pool
const Mexc = require('mexc-sdk');

var log = require('./logger.js').LOG
var send_html = require('./telegram.js').send_html

function convert(s) { return parseInt(s).toLocaleString() }

const decimals = 6
function broadcast(s, level) {
    if (level == null) level = 'info'
    if (level == 'info') {
        log.info(s);
    }
    if (level == 'error') {
        log.error(s);
    }
    console.log(s)
    //send_html(s)
}

class Trader {
    constructor(db_source, key, secret) {
        this.secret = secret
        this.db_source = db_source
        //this.symbol = symbol
        this.client = new Mexc.Spot(key, secret)
    }

    async order_cancel(symbol, order_id) {
        try {
            if (!order_id) return
            broadcast(`Cancelling trade - ${order_id}`, 'info')
            let res = this.client.cancelOrder(symbol, { orderId: order_id })
            //let res = this.client.cancelOrder(symbol, { orderId: order_id })
            //broadcast(res)
            let sql = `UPDATE public.trades set status = 'CANCELED ALGO' 
              WHERE order_id = $1 and (status = null or status = 'NEW') ;`
            const pg_result = await pool.query(sql, [order_id])
        } catch (e) { broadcast(e, 'error') }
    }

    open_orders(symbol) { return this.client.openOrders(symbol) }

    async close_all_open(symbol) {
        broadcast(`Deleting open orders for ${this.db_source}`, 'info')
        await this.open_orders(symbol).forEach(async o => { await this.order_cancel(symbol, o.orderId) })
    }

    async order_create_limit(symbol, price, side, quantity, bid, ask, mid, skew) {
        try {
            broadcast(`Creating limit order - ${this.db_source}: ${side} ${convert(quantity)} ${symbol} @ ${price.toFixed(decimals)}`, 'info')
            let res = this.client.newOrder(symbol, side, 'LIMIT', { quantity: quantity, price: price })
            let order_id = res.orderId
            //broadcast(res)
            let sql = `INSERT INTO public.trades( symbol, price, is_sell, quantity, order_id, order_receipt, source, transaction_time, bid, ask, mid, skew ) 
          VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`
            const pg_result = await pool.query(sql, [symbol, price, side == 'SELL', quantity, order_id, JSON.stringify(res), this.db_source, res.transactTime, bid, ask, mid, skew])
            broadcast(` -> ${order_id}`, 'info')
            return order_id
        } catch (e) {
            broadcast(e, 'error');
            return null;
        }
    }

    print_balance() {
        let info = this.client.accountInfo()
        let balances = info.balances

        let usdt = balances.filter(x => x.asset == 'USDT')[0].free
        let games = balances.filter(x => x.asset == 'GAMES')[0].free

        broadcast(`${this.db_source} : ${convert(usdt)} USDT - ${convert(games)} GAMES`, 'info')
    }
    
    get_balance() {
        let info = this.client.accountInfo()
        let balances = info.balances

        let usdt = balances.filter(x => x.asset == 'USDT')[0].free
        let games = balances.filter(x => x.asset == 'GAMES')[0].free
        return { usdt: usdt, games: games }
    }

    is_filled(symbol, order_id) {
        let o = this.query_order(symbol, order_id)
        return (o['status'] == 'FILLED' || o['status'] == 'PARTIALLY FILLED')
    }

    query_order(symbol, order_id) { return this.client.queryOrder(symbol, { orderId: order_id }) }

    async check_db_null_orders(symbol) {
        try {
            broadcast(`UPDATING orders with no status in DB for ${this.db_source}`, 'info')
            let sql = `select order_id from trades where (status is null or status = 'NEW') and source = '${this.db_source}';`
            const pg_result = await pool.query(sql)
            let rows = pg_result.rows
            //broadcast(pg_result.rows, 'info')

            let order_ids = rows.map(x => x.order_id)
            //broadcast(`Found ${order_ids.length} trades to check`, 'info')

            for (let order_id of order_ids) {
                let res = this.client.queryOrder(symbol, { orderId: order_id })
                broadcast(`DB: ${order_id} <- ${res['status']}`)
                let sql = "UPDATE public.trades set status = $2, executed_price = $3, executed_quantity = $4, update_time = $5 WHERE order_id = $1;"
                const pg_result = await pool.query(sql, [order_id, res['status'], parseFloat(res['price']), parseFloat(res['executedQty']), parseInt(res['updateTime'])])
            }
        } catch (e) { broadcast(e, 'error') }

    }


}

Object.defineProperty(exports, "Trader", { value: Trader });