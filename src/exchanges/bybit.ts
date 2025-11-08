import { EXCHANGES, INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D } from "@/utils/exchanges";

import type {
    OrderBookTypes, 
    ParsedOB,
    Candle,
} from "@/utils/types";

import type { CandlestickData } from 'lightweight-charts';

export class BybitSocketParser {
    public readonly exchangeId = EXCHANGES.BYBIT;

    private pingIntervalId: number | null = null;

    private intervalMap: Record<string, string> = {
        [INTERVAL_1M]: '1',
        [INTERVAL_5M]: '5',
        [INTERVAL_15M]: '15',
        [INTERVAL_1H]: '60',
        [INTERVAL_1D]: 'D',
    }; 

    constructor() { };

    startPing(_ws: WebSocket) {
        this.pingIntervalId = window.setInterval(() => {
            if (_ws.readyState === WebSocket.OPEN) {
                _ws.send(JSON.stringify({ op: 'ping' }));
            }
        }, 20_000);
    };

    stopPing() {
        clearInterval(this.pingIntervalId ?? undefined);
        this.pingIntervalId = null;
    };

    pong = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<boolean | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.ret_msg === 'pong') return true;

        return false;
    }

    link = async (): Promise<string> => "wss://stream.bybit.com/v5/public/spot";

    sub_msg = async (pair: string, interval: string): Promise<string> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}${quote}`;
        const i = this.intervalMap[interval];

        return JSON.stringify({
            op: "subscribe",
            args: [`orderbook.50.${marketId}`, `kline.${i}.${marketId}`],
        });
    };

    unsub_msg = async (pair: string, interval: string): Promise<string> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}${quote}`;
        const i = this.intervalMap[interval];

        return JSON.stringify({
            op: "unsubscribe",
            args: [`orderbook.50.${marketId}`, `kline.${i}.${marketId}`],
        });
    };
    
    ob_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<ParsedOB | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.ret_msg || !data.topic.includes('orderbook')) return;

        const parseOrders = (orders?: [string, string][]): OrderBookTypes[] => (
            orders ?? []).map(([p, a]) => {
                const price = Number(p);
                const amount = Number(a);
                return { price, amount, total: price * amount };
            }
        );
        
        const bidsRaw = data.data?.b;
        const asksRaw = data.data?.a;

        const type = data.type === "snapshot" ? "snapshot" : "delta";

        return {
            type,
            bids: parseOrders(bidsRaw),
            asks: parseOrders(asksRaw),
        };
    };

    cs_parse = async (_ws: WebSocket, msg: MessageEvent<any>): Promise<Candle | undefined> => {
        const data = JSON.parse(msg.data);

        if (data.ret_msg || !data.topic.includes('kline')) return;

        const candleArray = data.data;
        const candle = candleArray[0];
        return {
            time: candle.start / 1000,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: Number(candle.volume),
        }
    };

    cs_loadhistory = async (_ws: WebSocket, pair: string, interval: string): Promise<Candle[] | undefined> => {
        const [base, quote] = pair.split('/');
        const marketId = `${base}${quote}`;
        const i = this.intervalMap[interval];

        const response = await fetch(
            `https://api.bybit.com/v5/market/kline?category=spot&symbol=${marketId}&interval=${i}&limit=200`
        );
        const data = await response.json();

        if (data.retCode === 0) {
            const candles: Candle[] = data.result.list.map(([time, open, high, low, close, volume]: [string, string, string, string, string, string]) => ({
                time: Number(time) / 1000,
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume),
            })).sort((a: CandlestickData, b: CandlestickData) => (a.time as number) - (b.time as number));

            return candles;
        }
    }
}