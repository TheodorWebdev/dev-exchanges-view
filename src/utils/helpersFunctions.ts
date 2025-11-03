import type { OrderBookTypes, MessageType } from "@/utils/types.ts";
import type { UTCTimestamp } from 'lightweight-charts'

export function updateOrderBookLevels(
    map: Map<number, OrderBookTypes>,
    entries: [number, number][]
): void {
    for (const [price, amount] of entries) {
        if (amount === 0) {
            map.delete(price);
        } else {
            map.set(price, { price, amount, total: price * amount });
        }
    }
}

export function detectMessageType(msg: any): MessageType {
    // Bybit
    if (msg.topic && (msg.topic.includes('kline') || msg.topic.includes('orderbook'))) {
        return msg.topic.includes('kline') ? 'kline' : 'orderbook';
    }

    // Binance
    if (msg.asks || msg.e === 'kline') {
        return msg.e === 'kline' ? 'kline' : 'orderbook';
    }

    return 'unknown';
}

export async function loadHistory() {
    try {
        const response = await fetch(
            `https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=1&limit=200`
        );
        const data = await response.json();

        if (data.retCode === 0) {
            const candles = data.result.list.map(([time, open, high, low, close]: [string, string, string, string, string]) => ({
                time: Number(time) / 1000 as UTCTimestamp,
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
            })).sort((a, b) => a.time - b.time);

            candleSeries.setData(candles);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}