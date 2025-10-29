import type { Candle, OrderBookTypes, OrderBookBybitData } from "@/utils/types.ts";

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
            bidsMap: Map<number, OrderBookTypes>,
            asksMap: Map<number, OrderBookTypes>,
            lastSeq: number | null
        ): {
            bids: OrderBookTypes[];
            asks: OrderBookTypes[];
            lastSeq: number | null;
        } {
            if (!data.b || !data.a || data.u === undefined)
                return { bids: [], asks: [], lastSeq };

            if (data.type === "snapshot") {
                bidsMap.clear();
                asksMap.clear();

                data.b.forEach(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    bidsMap.set(price, { price, amount, total: price * amount });
                });

                data.a.forEach(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    asksMap.set(price, { price, amount, total: price * amount });
                });

                lastSeq = data.seq;
            }

            if (data.type === "delta") {
                if (lastSeq === null || data.seq <= lastSeq)
                    return { bids: [], asks: [], lastSeq };

                data.b.forEach(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    if (amount === 0) bidsMap.delete(price);
                    else bidsMap.set(price, { price, amount, total: price * amount });
                });

                data.a.forEach(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    if (amount === 0) asksMap.delete(price);
                    else asksMap.set(price, { price, amount, total: price * amount });
                });

                lastSeq = data.seq;
            }

            return {
                bids: Array.from(bidsMap.values()).sort((a, b) => b.price - a.price),
                asks: Array.from(asksMap.values()).sort((a, b) => a.price - b.price),
                lastSeq,
            };
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
