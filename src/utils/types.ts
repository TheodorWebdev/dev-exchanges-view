export interface OrderBook {
    price: number;
    amount: number;
    total: number;
}

export interface Candle {
    time: number | string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface OrderBookBybitData {
    s: string;
    b: Map<string, string>;
    a: Map<string, string>;
    u: number;
    seq: number;
}

export interface OrderBookBinanceData {
    e: string;
    E: number;
    s: string;
    U: number;
    u: number;
    b: [string, string][];
    a: [string, string][];
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