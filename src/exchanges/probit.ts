import {EXCHANGES, SOCKET_URLS} from "@/utils/exchanges.ts";
import type {Candle, OrderBookTypes, ParsedOB, ProbitOrder} from "@/utils/types.ts";

export class ProbitSocketParser {
    public readonly exchangeId = EXCHANGES.PROBIT;

    get ping() {
        return JSON.stringify({ op: "ping" });
    };

    get pingInterval() {
        return 15_000;
    };

    constructor() { };

    link(): string {
        return SOCKET_URLS.PROBIT;
    }

    ob_sub_msg = async (pair: string, interval = 100): Promise<string> => {
        const symbol = pair.replace("/", "-").toUpperCase();

        console.log(symbol);
        return JSON.stringify({
            type: "subscribe",
            channel: "marketdata",
            interval: interval,
            market_id: symbol,
            filter: ['ticker', 'order_books']
        });
    };

    // на свечи
    candle_sub_msg = async (pair: string, interval = "1m"): Promise<string> => {
        const symbol = pair.replace("/", "").toUpperCase();
        return JSON.stringify({
            type: "subscribe",
            channel: "candlestick",
            filter: { market_id: symbol, interval }
        });
    };


    ob_unsub_msg = async (pair: string): Promise<string> => {
        const symbol = pair.replace("/", "").toUpperCase();
        return JSON.stringify({
            type: "unsubscribe",
            channel: "marketdata",
            filter: {
                market_id: [symbol]
            }
        });
    };

    ob_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.ret_msg === "pong") return;

        const orderBooksRaw: ProbitOrder[] = data.order_books ?? [];

        if (!orderBooksRaw.length) return;

        const parseOrders = (orders?: ProbitOrder[]): OrderBookTypes[] =>
            (orders ?? [])
                .filter(o => Number(o.quantity) > 0)
                .map(o => {
                    const price = Number(o.price);
                    const amount = Number(o.quantity);
                    return { price, amount, total: price * amount };
                });


        const bidsRaw = orderBooksRaw.filter(o => o.side === 'buy');
        const asksRaw = orderBooksRaw.filter(o => o.side === 'sell');

        return {
            type: 'snapshot',
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    }


    parseCandlestick(msg: MessageEvent<any>, candles: Candle[]): Candle[] {
        const parsedMsg = JSON.parse(msg.data);

        if (!parsedMsg.data || !parsedMsg.data.k) return candles;

        const k = parsedMsg.data.k;
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
