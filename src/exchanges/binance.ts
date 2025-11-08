import { EXCHANGES } from "@/utils/exchanges";

import type {
    OrderBookTypes,
    ParsedOB,
    Candle,
} from "@/utils/types";

export class BinanceSocketParser {
    public readonly exchangeId = EXCHANGES.BINANCE;

    private pingIntervalId: number | null = null;

    constructor() { };

    startPing = () => { };

    stopPing = () => { };

    pong = () => {};

    link = async (): Promise<string> => "wss://stream.binance.com:9443/ws";

    sub_msg = async (pair: string, interval: string): Promise<string> => {
        const [base, quote] = pair.split('/').map(s => s.toLowerCase());
        const marketId = `${base}${quote}`;

        return JSON.stringify({
            method: "SUBSCRIBE",
            params: [`${marketId}@depth20@100ms`, `${marketId}@kline_${interval}`],
            id: Date.now(),
        });
    };

    unsub_msg = async (pair: string, interval: string): Promise<string> => {
        const [base, quote] = pair.split('/').map(s => s.toLowerCase());
        const marketId = `${base}${quote}`;

        return JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [`${marketId}@depth20@100ms`, `${marketId}@kline_${interval}`],
            id: Date.now(),
        });
    };

    ob_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.method || !data.asks) return;

        const parseOrders = (orders?: [string, string][]): OrderBookTypes[] =>
            (orders ?? []).map(([p, a]) => {
                const price = Number(p);
                const amount = Number(a);
                return { price, amount, total: price * amount };
            });

        const bidsRaw = data?.bids;
        const asksRaw = data?.asks;

        if (!bidsRaw && !asksRaw) return undefined;

        return {
            type: "snapshot",
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    };

    cs_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<Candle | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.method || !data.e) return;

        const k = data.k;

        return {
            time: Number(k.t) / 1000,
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
        }
    }

    cs_loadhistory = async (_ws: WebSocket, pair: string, interval: string) => {
        const [base, quote] = pair.split('/').map(s => s.toUpperCase());
        const marketId = `${base}${quote}`;

        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${marketId}&interval=${interval}&limit=200`
        );
        const data: any[] = await response.json();

        const candles: Candle[] = data.map(item => ({
            time: Number(item[0]) / 1000,
            open: Number(item[1]),
            high: Number(item[2]),
            low: Number(item[3]),
            close: Number(item[4]),
            volume: Number(item[5]),
        }));

        return candles;
    }
}
