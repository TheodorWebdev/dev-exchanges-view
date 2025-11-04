import {EXCHANGES, SOCKET_URLS} from "@/utils/exchanges.ts";
import type {Candle, FetchCandlesOptions, ParsedOB, ProbitOrder} from "@/utils/types.ts";
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
        const pairObj = PAIRS.find(p => `${p.base}${p.quote}`.toUpperCase() === pair.replace("/", "").toUpperCase());

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

    cs_parse = async (
        _: WebSocket,
        msg: MessageEvent<any>,
        pair?: string,
        type: string = "5min"
    ): Promise<Candle | Candle[] | undefined> => {
        try {
            const message = JSON.parse(msg.data);

            if (message?.type === "pong" || message?.op === "pong") return;

            let klineData: Candle[] = [];

            if (Array.isArray(message?.data) && message.data.length) {
                klineData = message.data.map((candle: any) => {
                    const ts = new Date(candle.start_time);
                    const time = Math.floor(ts.getTime() / 1000);

                    return {
                        time,
                        open: +candle.open,
                        high: +candle.high,
                        low: +candle.low,
                        close: +candle.close,
                    };
                });
            }

            else if (pair) {
                const candles = await this.fetchCandles(pair, { type, limit: 100 });
                klineData = candles || [];
            }

            if (klineData.length > 1) {
                return klineData;
            }

            if (klineData.length === 1) {
                return klineData[0];
            }

            return undefined;

        } catch (err) {
            console.error("cs_parse error:", err);
            return undefined;
        }
    };

    // на свечи
    async fetchCandles(pair: string, meta: FetchCandlesOptions = { type: "5min", limit: 100 }) {
        try {
            const { type = "5min", limit = 100 } = meta;
            let { start, end } = meta;

            const types: Record<string, string> = {
                "1min": "1m",
                "5min": "5m",
                "15min": "15m",
                "30min": "30m",
                "1hour": "1h",
                "4hour": "4h",
                "1day": "1D",
                "1week": "1W",
            };

            const weights: Record<string, number> = {
                "1min": 60 * 1000,
                "5min": 5 * 60 * 1000,
                "15min": 15 * 60 * 1000,
                "30min": 30 * 60 * 1000,
                "1hour": 60 * 60 * 1000,
                "4hour": 4 * 60 * 60 * 1000,
                "1day": 24 * 60 * 60 * 1000,
                "1week": 7 * 24 * 60 * 60 * 1000,
            };

            const intervalMs = weights[type] ?? weights["5min"];
            start = start ?? Date.now() - limit * intervalMs;
            end = end ?? Date.now();

            // находим пару
            const pairObj = PAIRS.find(
                p => `${p.base}${p.quote}`.toUpperCase() === pair.replace("/", "").toUpperCase()
            );

            const symbol = pairObj
                ? `${pairObj.base}-${pairObj.quote}`.toUpperCase()
                : pair.replace("/", "-").toUpperCase();

            // используем прокси вместо прямого хоста
            const url = new URL(`/probit-api/api/exchange/v1/candle`, window.location.origin);
            url.searchParams.append("market_ids", symbol);
            url.searchParams.append("start_time", new Date(start).toISOString());
            url.searchParams.append("end_time", new Date(end).toISOString());
            url.searchParams.append("interval", types[type] ?? "5m");
            url.searchParams.append("sort", "asc");
            url.searchParams.append("limit", limit.toString());

            const res = await fetch(url.toString(), { method: "GET", headers: { accept: "application/json" } });
            if (!res.ok) throw new Error(`Failed to fetch candles: ${res.status} ${res.statusText}`);

            const json = await res.json();
            const klineData = (json.data ?? []).map((line: any) => {
                const ts = new Date(line.start_time);
                const time = Math.floor(ts.getTime() / 1000);

                return {
                    time,
                    open: +line.open,
                    high: +line.high,
                    low: +line.low,
                    close: +line.close,
                };
            });

            console.log(klineData);
            return klineData;

        } catch (err) {
            console.error("fetchCandles error:", err);
            return [];
        }
    }


}
