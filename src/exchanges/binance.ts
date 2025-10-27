import type { Candle, KlineStreamDataBinance, OrderBook, OrderBookBinanceData } from "@/utils/types.ts";
import React from "react";


export function createBinanceSubscribeMessage(topics: string[]) {
    return JSON.stringify({
        method: 'SUBSCRIBE',
        params: topics,
        id: 1
    });
}

export function createBinanceUnsubscribeMessage(topics: string[]) {
    return JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: topics,
        id: 1
    });
}

export function BinanceParser() {
    const bidsMap = new Map<number, OrderBook>();
    const asksMap = new Map<number, OrderBook>();
    let lastUpdateId: number | null = null;

    return {
        parseOrderBook(
            data: OrderBookBinanceData,
            setBids: (b: OrderBook[]) => void,
            setAsks: (a: OrderBook[]) => void
        ) {
            if (!data.a || !data.b || data.u === undefined || data.U === undefined) return;

            if (lastUpdateId === null) lastUpdateId = data.u;
            if (data.u < (lastUpdateId ?? 0)) return;

            if (data.U > (lastUpdateId ?? 0) + 1) {
                bidsMap.clear();
                asksMap.clear();
                lastUpdateId = data.u;
                return;
            }

            data.a.forEach(([priceStr, qtyStr]: [string, string]) => {
                const price = parseFloat(priceStr);
                const amount = parseFloat(qtyStr);
                if (amount === 0) asksMap.delete(price);
                else asksMap.set(price, { price, amount, total: price * amount });
            });

            data.b.forEach(([priceStr, qtyStr]: [string, string]) => {
                const price = parseFloat(priceStr);
                const amount = parseFloat(qtyStr);
                if (amount === 0) bidsMap.delete(price);
                else bidsMap.set(price, { price, amount, total: price * amount });
            });

            lastUpdateId = data.u;
            setBids(Array.from(bidsMap.values()).sort((a, b) => b.price - a.price));
            setAsks(Array.from(asksMap.values()).sort((a, b) => a.price - b.price));
        },

        parseCandlestick(
            data: KlineStreamDataBinance,
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
