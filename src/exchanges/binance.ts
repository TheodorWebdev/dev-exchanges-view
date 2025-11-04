import type {
    OrderBookTypes,
    ParsedOB,
    Candle,
} from "@/utils/types.ts";
import { EXCHANGES } from "@/utils/exchanges.ts";

export class BinanceSocketParser {
    public readonly exchangeId = EXCHANGES.BINANCE;

    private pingIntervalId: number | null = null;

    constructor() { };

    startPing = () => { };

    stopPing = () => {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    };

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
        const message = JSON.parse(msg.data);

        if (message.method || !message.e) return;

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
