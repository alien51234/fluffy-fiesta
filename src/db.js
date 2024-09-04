const { Pool } = require("pg");

const pool = new Pool({
  host: "158.220.82.221",
  user: "postgres",
  password: "onChain24",
  database: "onchain",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function execute_sql(sql, params) {
  //try {
  let pg_result = await pool.query(sql, params);
  var rows = pg_result.rows;
  return rows;
  //   } catch (e) {
  //     console.log(e);
  //   }
}

module.exports.Order = {
  async Create(order) {
    try {
      console.log(`Creating order`);
      console.log(order)
      sql = `
      insert into bogdabot.sessions (
        telegram_id, public_address, started_trading_on, private_key, 
        trade_interval_minutes, wallet, order_size)
      values($1, $2, now(), $3, $4, $5, $6) 
  	  returning *;
	  `;
      return execute_sql(sql, [
        order.telegram_id, order.public_address, order.private_key, 
        order.trade_interval_minutes,order.wallet, order.trade_size
      ]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  async save_wallet(session_id, wallet) {
    console.log(`Saving wallet ${wallet} to DB`);
  },
  async update_wallet(session_id, wallet) {
    try {
      console.log(`Saving wallet ${wallet} to session ${session_id}`);
      sql = `
	  UPDATE bogdabot.sessions
	  set wallet = $2
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id, wallet]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async update_keys(session_id, private_key, public_address) {
    try {
      console.log(
        `Saving keys (${private_key}, ${public_address}) to session ${session_id}`
      );
      sql = `
	  UPDATE bogdabot.sessions
	  set private_key = $2, public_address = $3
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id, private_key, public_address]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async update_wallet_amount(session_id, amount) {
    try {
      console.log(`Saving amount ${amount} to session ${session_id}`);
      sql = `
	  UPDATE bogdabot.sessions
	  set wallet_amount = $2
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id, amount]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async update_order_size(session_id, amount) {
    try {
      console.log(`Saving trade quantity ${amount} to session ${session_id}`);
      sql = `
	  UPDATE bogdabot.sessions
	  set order_size = $2
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id, amount]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async start_trading(session_id, interval) {
    try {
      console.log(
        `Start trading with interval ${interval} in session ${session_id}`
      );
      sql = `
	  UPDATE bogdabot.sessions
	  set started_trading_on = now(), trade_interval_minutes = $2
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id, interval]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async stop_trading(session_id) {
    try {
      console.log(`Stop trading in session ${session_id}`);
      sql = `
	  UPDATE bogdabot.sessions
	  set ended_trading_on = now()
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async cancel(session_id) {
    try {
      console.log(`Cancelling session ${session_id}`);
      sql = `
	  UPDATE bogdabot.sessions
	  set cancelled_on = now()
	  WHERE session_id = $1 
	  returning *;
	  `;
      return execute_sql(sql, [session_id]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  async get_open() {
    try {
      console.log(`Cancelling session ${session_id}`);
      sql = `
	  SELECT session_id, private_key, public_address, 
	  wallet, order_size, 
	  trade_interval_minutes, null status
	  from bogdabot.sessions
	  WHERE started_trading_on is not null
	  and ended_trading_on is null
	  and cancelled_on is null
	  order by created_on;
	  `;
      return execute_sql(sql, [session_id]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
};

module.exports.get_session_from_db = async function (telegram_id) {
  try {
    sql = `
    select session_id, telegram_id, private_key, public_address, wallet, wallet_amount, 
	order_size, trading_type,
    case when public_address is null then false else true end has_wallet,
    case when started_trading_on is null then false else true end is_trading
    FROM bogdabot.sessions
    WHERE telegram_id = $1
    and cancelled_on is null
    and ended_trading_on is null
    limit 1;
    `;
    let pg_result = await pool.query(sql, [telegram_id]);
    var rows = pg_result.rows;
    if (rows.length == 0) {
      sql = `
		    insert into bogdabot.sessions (telegram_id)
		    values($1) returning session_id, telegram_id, wallet;
		    `;
      let pg_result = await pool.query(sql, [telegram_id]);
      var rows = pg_result.rows;
    }
    return rows;
  } catch (e) {
    console.log(e);
  }
};

module.exports.Execution = {
  async save(
    session_id,
    from_public_address,
    from_private_key,
    to_public_address,
    to_private_key,
    order_size
  ) {
    try {
      sql = `INSERT INTO bogdabot.executions(
			to_public_address, to_private_key, order_size, session_id)
			VALUES ($2, $3, $4, $1);`;
      return execute_sql(sql, [
        session_id,
        to_public_address,
        to_private_key,
        order_size,
      ]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
};
