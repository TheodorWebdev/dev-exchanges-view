import type { OrderBookTypes } from "@/utils/types.ts";

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