import type {
    OrderBookTypes, 
    ParsedOB,
    Candle,
} from "@/utils/types";

import { EXCHANGES, INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D } from "@/utils/exchanges.ts";

export class BybitSocketParser {
    public readonly exchangeId = EXCHANGES.BYBIT;

    get ping() {
        return "";
    };

    get pingInterval() {
        return 15_000;
    };

    constructor() { };

    link = async (): Promise<string> => "wss://stream.bybit.com/v5/public/spot";

    intervalMap: Record<string, string> = {
        [INTERVAL_1M]: '1',
        [INTERVAL_5M]: '5',
        [INTERVAL_15M]: '15',
        [INTERVAL_1H]: '60',
        [INTERVAL_1D]: 'D',
    }; 

    sub_msg = async (pair: string, interval: string): Promise<string> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}${quote}`;
        const i = this.intervalMap[interval];

        return JSON.stringify({
            op: "subscribe",
            args: [`orderbook.50.${marketId}`, `kline.${i}.${marketId}`],
        });
    };

    unsub_msg = async (pair: string, interval: string): Promise<string> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}${quote}`;
        const i = this.intervalMap[interval];

        return JSON.stringify({
            op: "unsubscribe",
            args: [`orderbook.50.${marketId}`, `kline.${i}.${marketId}`],
        });
    };
    
    ob_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.ret_msg === "pong") return;

        const parseOrders = (orders?: [string, string][]): OrderBookTypes[] => (
            orders ?? []).map(([p, a]) => {
                const price = Number(p);
                const amount = Number(a);
                return { price, amount, total: price * amount };
            }
        );
        
        const bidsRaw = data.data?.b;
        const asksRaw = data.data?.a;

        const type = data.type === "snapshot" ? "snapshot" : "delta";

        return {
            type,
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    };

    cs_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<Candle | undefined> => {
        const message = JSON.parse(msg.data);

        const data = message.data;
        const candle = data[0];

        if (data.ret_msg === "pong") return;

        return {
            time: candle.start / 1000,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        }
    }
}