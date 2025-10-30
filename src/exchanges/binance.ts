import type {
    Candle,
    KlineStreamDataBinance,
    OrderBookTypes, ParsedOB
} from "@/utils/types.ts";
import {EXCHANGES, SOCKET_URLS} from "@/utils/exchanges.ts";

export class BinanceSocketParser {
    public readonly exchangeId = EXCHANGES.BINANCE;

    get ping() {
        return "";
    };

    get pingInterval() {
        return 15_000;
    };

    constructor() { };

    link(): string {
        return SOCKET_URLS.BINANCE;
    }

    ob_sub_msg = async (symbol: string, depth = 20): Promise<string> => {
        const s = symbol.toLowerCase();
        return JSON.stringify({
            method: "SUBSCRIBE",
            params: [`${s}@depth${depth}@100ms`],
            id: Date.now(),
        });
    };

    ob_unsub_msg = async (pair: string, depth = 20): Promise<string> => {
        const symbol = pair.replace("/", "").toLowerCase();
        return JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [
                `${symbol}@depth${depth}@100ms`
            ],
            id: Date.now(),
        });
    };

    ob_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const data = JSON.parse(msg.data);

        const parseOrders = (orders?: [string, string][]): OrderBookTypes[] =>
            (orders ?? []).map(([p, a]) => {
                const price = Number(p);
                const amount = Number(a);
                return { price, amount, total: price * amount };
            });

        const bidsRaw = data?.bids ?? data?.b;
        const asksRaw = data?.asks ?? data?.a;

        if (!bidsRaw && !asksRaw) return undefined;

        return {
            type: "snapshot",
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    };

    parseCandlestick(data: KlineStreamDataBinance, candles: Candle[]): Candle[] {
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
