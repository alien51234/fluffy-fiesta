export interface Order {
    save_wallet(session_id: string, wallet: string): Promise<void>;
    update_wallet(session_id: string, wallet: string): Promise<any>;
    update_keys(session_id: string, private_key: string, public_address: string): Promise<any>;
    update_wallet_amount(session_id: string, amount: number): Promise<any>;
    update_order_size(session_id: string, amount: number): Promise<any>;
    start_trading(session_id: string, interval: number): Promise<any>;
    stop_trading(session_id: string): Promise<any>;
    cancel(session_id: string): Promise<any>;
    get_open(): Promise<any>;
}

export interface Execution {
    save(session_id: string, from_public_address: string, from_private_key: string, to_public_address: string, to_private_key: string, order_size: number): Promise<any>;
}

export function get_session_from_db(telegram_id: string): Promise<any>;
