import {EXCHANGES, SOCKET_URLS} from "@/utils/exchanges.ts";
import type {Candle, ParsedOB} from "@/utils/types.ts";


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

    ob_sub_msg = (pair: string, depth = 20): string => {
        const symbol = pair.replace("/", "-").toUpperCase();
        return JSON.stringify({
            type: "subscribe",
            channel: "order_books",
            interval: 500,
            filter: { market_id: symbol, level: depth }
        });
    };

    // на свечи
    candle_sub_msg = (pair: string, interval = "1m"): string => {
        const symbol = pair.replace("/", "-").toUpperCase();
        return JSON.stringify({
            type: "subscribe",
            channel: "candlestick",
            filter: { market_id: symbol, interval }
        });
    };


    ob_unsub_msg = async (pair: string): Promise<string> => {
        const symbol = pair.replace("/", "-").toUpperCase();
        return JSON.stringify({
            type: "unsubscribe",
            channel: "order_books",
            filter: {
                market_id: symbol
            }
        });
    };

    ob_parse(msg: MessageEvent<any>): ParsedOB | undefined {
        const parsedMsg = JSON.parse(msg.data);

        const parseOrders = (orders?: [string, string][]) => {
            if (!orders) return [];
            return orders.map(([pStr, aStr]) => {
                const price = Number(pStr);
                const amount = Number(aStr);
                return { price, amount, total: price * amount };
            });
        };

        if (parsedMsg.type === "snapshot") {
            return {
                type: "snapshot",
                bids: parseOrders(parsedMsg?.data?.b),
                asks: parseOrders(parsedMsg?.data?.a),
            };
        }

        if (parsedMsg.type === "delta") {
            return {
                type: "delta",
                bids: parseOrders(parsedMsg?.data?.b),
                asks: parseOrders(parsedMsg?.data?.a),
            };
        }
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
