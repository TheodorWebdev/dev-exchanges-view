import type {
    Candle,
    OrderBookTypes, 
    ParsedOB
} from "@/utils/types.ts";

import { EXCHANGES, SOCKET_URLS } from "@/utils/exchanges.ts";

export class BybitSocketParser {
    public readonly exchangeId = EXCHANGES.BYBIT;

    get ping() {
        return "";
    };

    get pingInterval() {
        return 15_000;
    };

    constructor() { };

    link(): string {
        return SOCKET_URLS.BYBIT;
    };

    ob_sub_msg = async (pair: string, depth = 50): Promise<string> => {
        const symbol = pair.replace("/", "").toUpperCase();
        return JSON.stringify({
            op: "subscribe",
            args: [`orderbook.${depth}.${symbol}`]
        });
    };

    ob_unsub_msg = async (pair: string, depth = 50): Promise<string> => {
        const symbol = pair.replace("/", "").toUpperCase();
        return JSON.stringify({
            op: "unsubscribe",
            args: [`orderbook.${depth}.${symbol}`]
        });
    };

    ob_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.ret_msg === "pong") return;

        const parseOrders = (orders?: [string, string][]): OrderBookTypes[] =>
            (orders ?? []).map(([p, a]) => {
                const price = Number(p);
                const amount = Number(a);
                return { price, amount, total: price * amount };
            });
        
        const bidsRaw = data.data?.b;
        const asksRaw = data.data?.a;

        if (data.type === "snapshot") {
            return {
                type: "snapshot",
                bids: parseOrders(bidsRaw),
                asks: parseOrders(asksRaw),
            };
        };

        if (data.type === "delta") {
            return {
                type: "delta",
                bids: parseOrders(bidsRaw),
                asks: parseOrders(asksRaw),
            };
        };
    };

    parseCandlestick(data: { s: string; k: { t: number; o: string; h: string; l: string; c: string } }, candles: Candle[]): 
    Candle[] {
        const k = data.k;
        const newCandle: Candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
        };
        return [...candles.slice(-50), newCandle];
    }
}