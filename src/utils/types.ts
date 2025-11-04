export type MessageType = 'orderbook' | 'kline' | 'unknown';

export interface OrderBookTypes {
    price: number;
    amount: number;
    total: number;
}

export interface ParsedOB {
    type: "snapshot" | "delta";
    bids: OrderBookTypes[];
    asks: OrderBookTypes[];
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}


export interface ProbitOrder {
    side: 'buy' | 'sell';
    price: string;
    quantity: string;
}

export interface FetchCandlesOptions {
    type?: string;
    limit?: number;
    start?: number;
    end?: number;
}

export const PROBIT_INTERVAL_MAP: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "1h": "1hour",
    "1d": "1day",
};