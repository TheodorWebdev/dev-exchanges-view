import type {
    Candle,
    KlineStreamDataBinance,
    OrderBookBinanceData,
    OrderBookTypes
} from "@/utils/types.ts";

export function createBinanceSubscribeMessage(topics: string[]) {
    return JSON.stringify({
        method: "SUBSCRIBE",
        params: topics,
        id: Date.now(),
    });
}

export function createBinanceUnsubscribeMessage(topics: string[]) {
    return JSON.stringify({
        method: "UNSUBSCRIBE",
        params: topics,
        id: Date.now(),
    });
}

export function BinanceParser() {
    return {
        parseOrderBook(data: OrderBookBinanceData): {
            type: "snapshot",
            bids: OrderBookTypes[];
            asks: OrderBookTypes[];
        } {
            if (!data.a || !data.b) {
                return {type: "snapshot", bids: [], asks: [] };
            }

            console.log(data);

            const parse = (entries: [string, string][]): OrderBookTypes[] => {
                return entries.map(([priceStr, amountStr]) => {
                    const price = parseFloat(priceStr);
                    const amount = parseFloat(amountStr);
                    const total = price * amount;

                    return { price, amount, total };
                });
            };

            return {
                type: "snapshot",
                bids: parse(data.b).sort((a, b) => b.price - a.price),
                asks: parse(data.a).sort((a, b) => a.price - b.price),
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