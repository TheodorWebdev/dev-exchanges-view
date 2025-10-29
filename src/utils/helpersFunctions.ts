import type { OrderBookTypes } from "@/utils/types.ts";

export function updateOrderBookLevels(
    map: Map<number, OrderBookTypes>,
    entries: [string, string][]
): Map<number, OrderBookTypes> {
    const newMap = new Map(map);

    for (const [priceStr, amStr] of entries) {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amStr);

        if (amount === 0) newMap.delete(price);
        else newMap.set(price, { price, amount, total: price * amount });
    }

    return newMap;
}
