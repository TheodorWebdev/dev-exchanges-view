import type {
    OrderBookTypes,
    ParsedOB,
    Candle,
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

    sub_msg = async (pair: string, interval: string): Promise<string> => {
        const s = pair.toLowerCase();
        return JSON.stringify({
            method: "SUBSCRIBE",
            params: [`${s}@depth20@100ms`, `${s}@kline_${interval}`],
            id: Date.now(),
        });
    };

    unsub_msg = async (pair: string, interval: string): Promise<string> => {
        const s = pair.replace("/", "").toLowerCase();
        return JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [`${s}@depth20@100ms`, `${s}@kline_${interval}`],
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

    cs_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<Candle | undefined> =>  {
        const message = JSON.parse(msg.data);

        const k = message.k;

        return {
            time: Number(k.t / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
        }
    }
}
