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
    time: number | string;
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


export interface KlineInnerDataBinance {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
}

export interface KlineStreamDataBinance {
    e: string;
    E: number;
    s: string;
    k: KlineInnerDataBinance;
}