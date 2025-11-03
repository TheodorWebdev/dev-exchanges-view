import {EXCHANGES, SOCKET_URLS} from "@/utils/exchanges.ts";
import type {Candle, ParsedOB, ProbitOrder} from "@/utils/types.ts";
import {PAIRS} from "@/utils/pairs.ts";

export class ProbitSocketParser {
    public readonly exchangeId = EXCHANGES.PROBIT;

    get ping() {
        return JSON.stringify({ type: "ping" });
    };

    get pingInterval() {
        return 15_000;
    };

    constructor() { };

    link(): string {
        return SOCKET_URLS.PROBIT;
    }

    sub_msg = async (pair: string, interval = 500): Promise<string> => {
        const pairObj = PAIRS.find(p => p.symbol.replace("/", "").toUpperCase() === pair.replace("/", "").toUpperCase());

        const symbol = pairObj
            ? `${pairObj.base}-${pairObj.quote}`.toUpperCase()
            : pair.replace("/", "-").toUpperCase();

        const validInterval = [100, 500, 1000].includes(interval) ? interval : 100;

        return JSON.stringify({
            type: "subscribe",
            channel: "marketdata",
            interval: validInterval,
            market_id: symbol,
            filter: ["ticker", "order_books"]
        });
    };

    // на свечи
    async fetchCandles(pair: string, interval = "1m", limit = 100) {
        try {
            const pairObj = PAIRS.find(p => p.symbol.replace("/", "").toUpperCase() === pair.replace("/", "").toUpperCase());

            const symbol = pairObj
                ? `${pairObj.base}-${pairObj.quote}`.toUpperCase()
                : pair.replace("/", "-").toUpperCase();

            const end = new Date();
            const start = new Date(end.getTime() - 60 * 60 * 1000);

            const url = `https://api.probit.com/api/exchange/v1/candle?market_ids=${symbol}&start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(end.toISOString())}&interval=${interval}&sort=asc&limit=${limit}`;

            const options = {
                method: "GET",
                headers: { accept: "application/json" }
            };

            const res = await fetch(url, options);
            if (!res.ok) {
                throw new Error(`Failed to fetch candles: ${res.status} ${res.statusText}`);
            }

            const json = await res.json();

            console.log(json);
            return json.data;
        } catch (err) {
            console.error("fetchCandles error:", err);
            return [];
        }
    }


    unsub_msg = async (pair: string): Promise<string> => {
        const symbol = pair.replace("/", "-").toUpperCase();
        return JSON.stringify({
            type: "unsubscribe",
            channel: "marketdata",
            market_id: symbol,
            filter: ["ticker", "order_books"]
        });
    };

    ob_parse = async (_: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const root = JSON.parse(msg.data);

        if (!root?.order_books || !Array.isArray(root.order_books)) return;

        const data: ProbitOrder[] = root.order_books;

        const bidsRaw = data.filter(o => o.side === 'buy');
        const asksRaw = data.filter(o => o.side === 'sell');

        const parseOrders = (orders: ProbitOrder[]) =>
            orders.map(o => ({
                price: Number(o.price),
                amount: Number(o.quantity),
                total: Number(o.price) * Number(o.quantity)
            }));

        const type = root.type === 'snapshot' ? 'snapshot' : 'delta';

        return {
            type,
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    }

    cs_parse = async (_: WebSocket, msg: MessageEvent<any>, pair?: string): Promise<Candle | Candle[] | undefined> => {
        const message = JSON.parse(msg.data);

        if (message?.type === "pong" || message?.op === "pong") return;

        const data = message?.data;

        // Если пришли свечи через WebSocket
        if (Array.isArray(data)) {
            const candle = data[data.length - 1];
            if (!candle) return;

            return {
                time: candle.start / 1000,
                open: Number(candle.open),
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
            }
        }

        if (pair) {
            try {
                const candles = await this.fetchCandles(pair, "1m", 100);
                return candles.map(c => ({
                    time: new Date(c.start).getTime() / 1000,
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                }));
            } catch (err) {
                console.error("fetchCandles error in cs_parse:", err);
                return [];
            }
        }
    }

}
