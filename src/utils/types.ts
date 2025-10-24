export interface IOrderBook {
    price: number;
    amount: number;
    total: number;
}

export interface ICandle {
    time: number | string;
    open: number;
    high: number;
    low: number;
    close: number;
}

