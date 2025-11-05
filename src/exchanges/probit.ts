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

        if (!Array.isArray(message?.data) || !message.data.length) return;

        const data = message.data;
        const candle = data[0];

        console.log(candle)

        return {
            time: candle.start / 1000,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
        }
    };

    cs_loadhistory = async (_ws: WebSocket, pair: string, interval: string, limit = 100): Promise<Candle[] | undefined> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}-${quote}`;

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

        const now = Date.now();
        const intervalMs = 5 * 60 * 1000;
        const start = new Date(now - limit * intervalMs).toISOString();
        const end = new Date(now).toISOString();

        const url = `http://localhost:5173/probit-api/api/exchange/v1/candle?market_ids=${marketId}&interval=${types[interval] ?? "5m"}&start_time=${start}&end_time=${end}&limit=${limit}&sort=asc`;

        const res = await fetch(url, { headers: { accept: "application/json" } });
        const json = await res.json();

        console.log(json)

        return (json.data ?? []).map((candle: any) => ({
            time: Math.floor(new Date(candle.start_time).getTime() / 1000),
            open: +candle.open,
            high: +candle.high,
            low: +candle.low,
            close: +candle.close,
        }));
    }
}
