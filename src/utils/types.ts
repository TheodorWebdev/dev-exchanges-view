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
    volume?: number;
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