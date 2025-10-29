import type {
    Candle,
    KlineStreamDataBinance,
    OrderBookBinanceData,
    OrderBookTypes
} from "@/utils/types.ts";
import { updateOrderBookLevels } from "../utils/helpersFunctions.ts";

export function createBinanceSubscribeMessage(topics: string[]) {
    return JSON.stringify({
        method: "SUBSCRIBE",
        params: topics,
        id: 1,
    });
}

export function createBinanceUnsubscribeMessage(topics: string[]) {
    return JSON.stringify({
        method: "UNSUBSCRIBE",
        params: topics,
        id: 1,
    });
}

export function BinanceParser() {
    return {
        parseOrderBook(
            data: OrderBookBinanceData,
            bidsMap: Map<number, OrderBookTypes>,
            asksMap: Map<number, OrderBookTypes>,
            lastUpdateId: number | null
        ): {
            bids: OrderBookTypes[];
            asks: OrderBookTypes[];
            lastUpdateId: number | null;
        } {
            if (!data.a || !data.b || data.u === undefined || data.U === undefined)
                return { bids: [], asks: [], lastUpdateId };

            if (lastUpdateId === null) lastUpdateId = data.u;
            if (data.u < lastUpdateId) return { bids: [], asks: [], lastUpdateId };

            if (data.U > lastUpdateId + 1) {
                bidsMap.clear();
                asksMap.clear();
                lastUpdateId = data.u;
                return { bids: [], asks: [], lastUpdateId };
            }

            // общ функц
            const updatedAsks = updateOrderBookLevels(asksMap, data.a);
            const updatedBids = updateOrderBookLevels(bidsMap, data.b);

            lastUpdateId = data.u;

            return {
                bids: Array.from(updatedBids.values()).sort((a, b) => b.price - a.price),
                asks: Array.from(updatedAsks.values()).sort((a, b) => a.price - b.price),
                lastUpdateId,
            };
        },

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
        },
    };
}
