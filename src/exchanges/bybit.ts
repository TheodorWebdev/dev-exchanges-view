import type { Candle, OrderBook, OrderBookBybitData } from "@/utils/types.ts";
import React from "react";

export function BybitParser() {
    const bidsMap = new Map<number, OrderBook>();
    const asksMap = new Map<number, OrderBook>();
    let lastSeq: number | null = null;

    return {
        parseOrderBook(
            data: OrderBookBybitData,
            setBids: (b: OrderBook[]) => void,
            setAsks: (a: OrderBook[]) => void
        ) {
            if (!data.b || !data.a || data.u === undefined) return;

            if (lastSeq === null) lastSeq = data.seq;
            if (data.seq <= (lastSeq ?? 0)) return;

            if (data.seq > (lastSeq ?? 0) + 1) {
                bidsMap.clear();
                asksMap.clear();
                lastSeq = data.seq;
                return;
            }

            data.b.forEach((amountStr, priceStr) => {
                const price = parseFloat(priceStr);
                const amount = parseFloat(amountStr);
                if (amount === 0) bidsMap.delete(price);
                else bidsMap.set(price, { price, amount, total: price * amount });
            });

            data.a.forEach((amountStr, priceStr) => {
                const price = parseFloat(priceStr);
                const amount = parseFloat(amountStr);
                if (amount === 0) asksMap.delete(price);
                else asksMap.set(price, { price, amount, total: price * amount });
            });

            lastSeq = data.seq;

            setBids(Array.from(bidsMap.values()).sort((a, b) => b.price - a.price));
            setAsks(Array.from(asksMap.values()).sort((a, b) => a.price - b.price));
        },

        parseCandlestick(
            data: { s: string; k: { t: number; o: string; h: string; l: string; c: string } },
            setCandles: React.Dispatch<React.SetStateAction<Candle[]>>
        ) {
            const k = data.k;
            const newCandle: Candle = {
                time: Math.floor(k.t / 1000),
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
            };
            setCandles(prev => [...prev.slice(-50), newCandle]);
        },
    };
}
