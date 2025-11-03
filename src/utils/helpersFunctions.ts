import type { OrderBookTypes, MessageType } from "@/utils/types.ts";

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

    //Probit
    if (msg.channel === 'marketdata' && Array.isArray(msg.order_books)) {
        return 'orderbook';
    }

    if (msg.channel === 'candlestick' && Array.isArray(msg.data)) {
        return 'kline';
    }

    return 'unknown';
}