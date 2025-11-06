import { EXCHANGES } from "@/utils/exchanges.ts";
import type { Candle, ParsedOB, ProbitOrder } from "@/utils/types.ts";

export class ProbitSocketParser {
    public readonly exchangeId = EXCHANGES.PROBIT;

    private pingIntervalId: number | null = null;

    constructor() { };

    startPing = () => { };

    stopPing = () => {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    };

    pong = () => {};

    link = async (): Promise<string> => "wss://api.probit.com/api/exchange/v1/ws";

    sub_msg = async (pair: string): Promise<string> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}-${quote}`;

        return JSON.stringify({
            type: "subscribe",
            channel: "marketdata",
            interval: 100,
            market_id: marketId,
            filter: [
                "order_books",
                "recent_trades"
            ]
        });
    };

    unsub_msg = async (pair: string): Promise<string> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}-${quote}`;
        
        return JSON.stringify({
            type: "unsubscribe",
            channel: "marketdata",
            market_id: marketId,
            filter: [
                "order_books",
                "recent_trades"
            ]
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

        const type = root.reset ? 'snapshot' : 'delta';

        return {
            type,
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    }

    private currentCandle: { open: number; high: number; low: number; close: number; time: number } | undefined = undefined;

    cs_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<Candle | undefined> => {
        const message = JSON.parse(msg.data);

        if (!(message.recent_trades && Array.isArray(message.recent_trades))) return;

        const trade = message.recent_trades[0];

        if (!trade) return;

        const price = Number(trade.price);
        const timeMs = new Date(trade.time).getTime();
        const time = Math.floor(timeMs / 1000);

        const interval = 60;
        const candleTime = Math.floor(time / interval) * interval;

        if (!this.currentCandle || this.currentCandle.time !== candleTime) {
            if (this.currentCandle) {
                const prevCandle = this.currentCandle;
                this.currentCandle = {
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                    time: candleTime,
                };
                return prevCandle;
            } else {
                this.currentCandle = {
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                    time: candleTime,
                };
            }
        } else {
            this.currentCandle.high = Math.max(this.currentCandle.high, price);
            this.currentCandle.low = Math.min(this.currentCandle.low, price);
            this.currentCandle.close = price;
        }

        return this.currentCandle;
    };

    cs_loadhistory = async (_ws: WebSocket, pair: string, interval: string, limit = 200): Promise<Candle[] | undefined> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}-${quote}`;
        const i = interval === "1d" ? "1D" : interval;

        const weights: Record<string, number> = {
            "1m": 60 * 1000,
            "5m": 5 * 60 * 1000,
            "15m": 15 * 60 * 1000,
            "1h": 60 * 60 * 1000,
            "1d": 24 * 60 * 60 * 1000,
        };

        const now = Date.now();
        const intervalMs = weights[interval];
        const start = new Date(now - limit * intervalMs).toISOString();
        const end = new Date(now).toISOString();

        const url = `http://localhost:5173/probit-api/api/exchange/v1/candle?market_ids=${marketId}&interval=${i}&start_time=${start}&end_time=${end}&limit=${limit}&sort=asc`;

        const res = await fetch(url, { headers: { accept: "application/json" } });
        const json = await res.json();

        return (json.data ?? []).map((candle: any) => ({
            time: Math.floor(new Date(candle.start_time).getTime() / 1000),
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        }));
    }
}
