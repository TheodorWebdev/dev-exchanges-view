import { EXCHANGES, INTERVAL_15M, INTERVAL_1D, INTERVAL_1H, INTERVAL_1M, INTERVAL_5M } from "@/utils/exchanges";

import type { 
    Candle, 
    ParsedOB, 
    ProbitOrder 
} from "@/utils/types";

export class ProbitSocketParser {
    public readonly exchangeId = EXCHANGES.PROBIT;

    private currentCandle: { open: number; high: number; low: number; close: number; time: number } | undefined;

    private intervalMap: Record<string, number> = {
        [INTERVAL_1M]: 60 * 1000,
        [INTERVAL_5M]: 5 * 60 * 1000,
        [INTERVAL_15M]: 15 * 60 * 1000,
        [INTERVAL_1H]: 60 * 60 * 1000,
        [INTERVAL_1D]: 24 * 60 * 60 * 1000,
    };

    private intervalMs: number = 60 * 1000;

    constructor() { };

    startPing = () => { };

    stopPing = () => { };

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

    cs_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<Candle | undefined> => {
        const message = JSON.parse(msg.data);

        if (!(message.recent_trades && Array.isArray(message.recent_trades))) return;

        if (message.recent_trades.length === 100) {
            const trades = message.recent_trades;

            const lastTrade = trades[trades.length - 1];
            const lastTradeTimeMs = new Date(lastTrade.time).getTime();
            const intervalMs = this.intervalMs;

            const tradesInLastMinute = trades.filter((trade: any) => {
                const tradeTimeMs = new Date(trade.time).getTime();
                
                return tradeTimeMs >= (lastTradeTimeMs - intervalMs) && tradeTimeMs <= lastTradeTimeMs;
            });

            if (tradesInLastMinute.length > 0) {
                const firstTradeInInterval = tradesInLastMinute[0];
                const lastTradeInInterval = tradesInLastMinute[tradesInLastMinute.length - 1];

                const open = Number(firstTradeInInterval.price);
                const close = Number(lastTradeInInterval.price);
                let high = open;
                let low = open;

                for (const trade of tradesInLastMinute) {
                    const price = Number(trade.price);
                    if (price > high) high = price;
                    if (price < low) low = price;
                }

                const intervalStartTimestampMs = Math.floor(lastTradeTimeMs / intervalMs) * intervalMs;

                return this.currentCandle = {
                    open: open,
                    high: high,
                    low: low,
                    close: close,
                    time: Math.floor(intervalStartTimestampMs / 1000),
                };
            }
        }
        
        const trade = message.recent_trades[0];

        if (!trade) return;

        const price = Number(trade.price);
        const timeMs = new Date(trade.time).getTime();
        const time = Math.floor(timeMs / 1000);

        const interval = this.intervalMs / 1000;
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

    cs_loadHistory = async (_ws: WebSocket, pair: string, interval: string, limit = 200): Promise<Candle[] | undefined> => {
        this.intervalMs = this.intervalMap[interval];

        const [base, quote] = pair.split('/');
        const marketId = `${base}-${quote}`;
        const i = interval === "1d" ? "1D" : interval;

        const now = Date.now();
        const intervalMs = this.intervalMap[interval];
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
