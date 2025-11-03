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

        return JSON.stringify({
            type: "subscribe",
            channel: "marketdata",
            interval: interval,
            market_id: symbol,
            filter: {
                order_books: ["order_books_l3"],
                ticker: true
            }
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

        console.log(data.type)

        const parseOrders = (orders?: ProbitOrder[]): OrderBookTypes[] =>
            (orders ?? []).map(o => {
                    const price = Number(o.price);
                    const amount = Number(o.quantity);
                    return { price, amount, total: price * amount };
                });


        const bidsRaw = orderBooksRaw.filter(o => o.side === 'buy');
        const asksRaw = orderBooksRaw.filter(o => o.side === 'sell');

        if (data.type === "snapshot") {
            return {
                type: "snapshot",
                bids: parseOrders(bidsRaw),
                asks: parseOrders(asksRaw),
            };
        }

        if (data.type === "delta") {
            return {
                type: "delta",
                bids: parseOrders(bidsRaw),
                asks: parseOrders(asksRaw),
            };
        }
    }


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
