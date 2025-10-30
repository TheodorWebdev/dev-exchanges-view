import type { Candle, OrderBookBybitData } from "@/utils/types.ts";

export function createBybitSubscribeMessage(topics: string[]) {
    return JSON.stringify({
        op: "subscribe",
        args: topics,
    });
}

export function createBybitUnsubscribeMessage(topics: string[]) {
    return JSON.stringify({
        op: "unsubscribe",
        args: topics,
    });
}

export function BybitParser() {
    return {
        parseOrderBook(
            data: OrderBookBybitData,
        ): {
            bids: [number, number][],
            asks: [number, number][],
        } {
            const bids: [number, number][] = data.b.map(([priceStr, amountStr]) => {
                const price = Number(priceStr);
                const amount = Number(amountStr);

                if (isNaN(price) || isNaN(amount)) return [0, 0];

                return [price, amount];
            });

            const asks: [number, number][] = data.a.map(([priceStr, amountStr]) => {
                const price = Number(priceStr);
                const amount = Number(amountStr);

                if (isNaN(price) || isNaN(amount)) return [0, 0];

                return [price, amount];
            });

            return { bids, asks };
        },

        parseCandlestick(
            data: { s: string; k: { t: number; o: string; h: string; l: string; c: string } },
            candles: Candle[]
        ): Candle[] {
            const k = data.k;
            const newCandle: Candle = {
                time: Math.floor(k.t / 1000),
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
            };
            return [...candles.slice(-50), newCandle];
        },
    };
}
