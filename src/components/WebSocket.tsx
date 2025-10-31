import { useEffect, useRef } from 'react';

import { BinanceSocketParser } from '@/exchanges/binance';
import { BybitSocketParser } from '@/exchanges/bybit';
import { ProbitSocketParser } from '@/exchanges/probit.ts';

import { eventEmitter, EVENTS } from '@/utils/events';
import type { Candle, OrderBookTypes } from '@/utils/types';

export default function WebSocketComponent() {
	const candlestickDataRef = useRef<Candle[]>([]);
	const wsRef = useRef<WebSocket | null>(null);
	const intervalRef = useRef<number | null>(null);
	const bidsRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const asksRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const parserRef = useRef<any>(null);

	const clearConnect = () => {
		if (wsRef.current) {
			console.log('WebSocket: закрываем старое соединение');
			wsRef.current.close();
			wsRef.current = null;
			candlestickDataRef.current = [];
			bidsRef.current.clear();
			asksRef.current.clear();
		}
	}

	// Подписка на события смены вебсокет соединения
	useEffect(() => {
		const handleConnectionChange = ({ wsUrl, exchange, pair }: { wsUrl: string, exchange: string, pair: string } ) => {
			clearConnect();

			switch (exchange) {
				case "BINANCE": {
					parserRef.current = new BinanceSocketParser();
					break;
				}
				case "BYBIT": {
					parserRef.current = new BybitSocketParser();
					break;
				}
				case "PROBIT": {
					parserRef.current = new ProbitSocketParser();
				}
			}

			const parser = parserRef.current;
			const ws = new WebSocket(wsUrl);

			ws.onopen = async () => {
				console.log("[WS] Cоединение создано");

				const msg = await parser.ob_sub_msg(pair)
				ws.send(msg);
			};

			ws.onmessage = async (event) => {
				const parsed = await parserRef.current.ob_parse(ws, event);
				if (!parsed) return;

				if (parsed.type === "snapshot") {
					bidsRef.current.clear();
					parsed.bids.forEach((el: OrderBookTypes) => {
						bidsRef.current.set(el.price, {
							price: el.price,
							amount: el.amount,
							total: el.price * el.amount,
						});
					});

					asksRef.current.clear();
					parsed.asks.forEach((el: OrderBookTypes) => {
						asksRef.current.set(el.price, {
							price: el.price,
							amount: el.amount,
							total: el.price * el.amount,
						});
					});
				}

				if (parsed.type === "delta") {
					parsed.bids.forEach((el: OrderBookTypes) => {
						if (el.amount === 0) {
							bidsRef.current.delete(el.price);
						} else {
							bidsRef.current.set(el.price, {
								price: el.price,
								amount: el.amount,
								total: el.price * el.amount,
							});
						}
					});

					parsed.asks.forEach((el: OrderBookTypes) => {
						if (el.amount === 0) {
							asksRef.current.delete(el.price);
						} else {
							asksRef.current.set(el.price, {
								price: el.price,
								amount: el.amount,
								total: el.price * el.amount,
							});
						}
					});
				}
			};

			ws.onclose = (event) => {
				if (event.wasClean) {
					console.log(`[close] Соединение закрыто чисто, код=${event.code}`);
				} else {
					console.log('[close] Соединение прервано');
				}
			};

			ws.onerror = (error) => {
				console.error('Ошибка WebSocket:', error);
			};

			wsRef.current = ws;
		};

		// Подписка на событие изменения соединения
		const unsubscribe = eventEmitter.on(EVENTS.WEBSOCKET_CONNECTION_CHANGE, handleConnectionChange);

		return () => {
			unsubscribe();
			if (wsRef.current) {
				console.log('WebSocket: закрываем соединение при размонтировании');
				wsRef.current.close();
			}
		};
	}, []);

	// Периодическая отправка событий с определённым интервалом
	useEffect(() => {
		const updateInterval = 500;

		intervalRef.current = setInterval(() => {
			// Инициализация событий: candlestick data
			if (candlestickDataRef.current.length > 0) {
				eventEmitter.emit(EVENTS.CANDLES_UPDATE, [...candlestickDataRef.current]);
			}
		}, updateInterval);

		intervalRef.current = setInterval(() => {
			// Инициализация событий: order book
			const bids = Array.from(bidsRef.current.values()).sort((a, b) => b.price - a.price).slice(0, 50);
			const asks = Array.from(asksRef.current.values()).sort((a, b) => a.price - b.price).slice(0, 50);

			if (bids.length > 0 || asks.length > 0) {
				const dataToEmit = { bids, asks };
      			const jsonString = JSON.stringify(dataToEmit); 

				eventEmitter.emit(EVENTS.ORDERBOOK_UPDATE, jsonString);
			}
		}, updateInterval);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	return null;
};