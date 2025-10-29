import type { Candle, OrderBookTypes, OrderBookBybitData } from "../utils/types.ts";
import React from "react";

export function createBybitSubscribeMessage(topics: string[]) {
    return JSON.stringify({
        op: 'subscribe',
        args: topics,
    });
}

export function createBybitUnsubscribeMessage(topics: string[]) {
    return JSON.stringify({
        op: 'unsubscribe',
        args: topics,
    });
}

export function BybitParser() {
    const bidsMap = new Map<number, OrderBookTypes>();
    const asksMap = new Map<number, OrderBookTypes>();
    return {
        parseOrderBook(
            data: OrderBookBybitData,
            type: 'snapshot' | 'delta',
            setBids: (b: OrderBookTypes[]) => void,
            setAsks: (a: OrderBookTypes[]) => void
        ) {
            if (!data.b || !data.a) {
                console.warn('BybitParser: данные стакана отсутствуют', data);
                return;
            }

            const newBids: OrderBookTypes[] = [];
            const newAsks: OrderBookTypes[] = [];

            if (type === 'snapshot') {
                if (Array.isArray(data.b)) {
                    data.b.forEach(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    if (isNaN(price) || isNaN(amount)) {
                        console.warn('BybitParser: некорректные данные bid:', priceStr, amountStr);
                        return;
                    }
                    newBids.push({ price, amount, total: price * amount });
                    });
                }

                if (Array.isArray(data.a)) {
                    data.a.forEach(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    if (isNaN(price) || isNaN(amount)) {
                        console.warn('BybitParser: некорректные данные ask:', priceStr, amountStr);
                        return;
                    }
                    newAsks.push({ price, amount, total: price * amount });
                    });
                }

                setBids(newBids);
                setAsks(newAsks);
            } else if (type === 'delta') {
                // Частичное обновление (delta)
                if (Array.isArray(data.b)) {
                    data.b.forEach(([priceStr, amountStr]) => {
                        const price = parseFloat(priceStr);
                        const amount = parseFloat(amountStr);
                        if (isNaN(price) || isNaN(amount)) {
                            console.warn('BybitParser: некорректные данные bid delta:', priceStr, amountStr);
                            return;
                        }

                        if (amount === 0) {
                            // Удаляем цену из bids
                            bidsMap.delete(price);
                        } else {
                            // Обновляем или добавляем цену
                            bidsMap.set(price, { price, amount, total: price * amount });
                        }
                    });
                }

                if (Array.isArray(data.a)) {
                    data.a.forEach(([priceStr, amountStr]) => {
                        const price = parseFloat(priceStr);
                        const amount = parseFloat(amountStr);
                        if (isNaN(price) || isNaN(amount)) {
                            console.warn('BybitParser: некорректные данные ask delta:', priceStr, amountStr);
                            return;
                        }

                        if (amount === 0) {
                            // Удаляем цену из asks
                            asksMap.delete(price);
                        } else {
                            // Обновляем или добавляем цену
                            asksMap.set(price, { price, amount, total: price * amount });
                        }
                    });
                }

                // Возвращаем текущие значения из Map
                setBids(Array.from(bidsMap.values()).sort((a, b) => b.price - a.price));
                setAsks(Array.from(asksMap.values()).sort((a, b) => a.price - b.price));
            }
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
