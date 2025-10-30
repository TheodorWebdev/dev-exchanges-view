import type {
    Candle,
    KlineStreamDataBinance,
    OrderBookBinanceData,
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

    private parseOrders(orders?: [string, string][]): OrderBookTypes[] {
        if (!orders) return [];
        return orders.map(([priceStr, amountStr]) => {
            const price = parseFloat(priceStr);
            const amount = parseFloat(amountStr);
            return { price, amount, total: price * amount };
        });
    }

    ob_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const parsedMsg: OrderBookBinanceData = JSON.parse(msg.data);
        return {
            type: "snapshot",
            bids: this.parseOrders(parsedMsg?.b),
            asks: this.parseOrders(parsedMsg?.a)
        };
    };

    parseOrderBook(data: OrderBookBinanceData): { bids: [number, number][], asks: [number, number][] } {
        const bids: [number, number][] = (data.b ?? []).map(([priceStr, amountStr]) => {
            const price = Number(priceStr);
            const amount = Number(amountStr);
            if (isNaN(price) || isNaN(amount)) return [0, 0];
            return [price, amount];
        });

        const asks: [number, number][] = (data.a ?? []).map(([priceStr, amountStr]) => {
            const price = Number(priceStr);
            const amount = Number(amountStr);
            if (isNaN(price) || isNaN(amount)) return [0, 0];
            return [price, amount];
        });

        return { bids, asks };
    }

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
