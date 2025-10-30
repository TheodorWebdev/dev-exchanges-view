import { useEffect, useRef } from 'react';

import { BybitParser, createBybitSubscribeMessage } from '@/exchanges/bybit';
import { BinanceParser, createBinanceSubscribeMessage } from '@/exchanges/binance';

import { eventEmitter, EVENTS } from '@/utils/events';
import type { Candle } from '@/utils/types';

export default function WebSocketComponent() {
	const candlestickDataRef = useRef<Candle[]>([]);
	const wsRef = useRef<WebSocket | null>(null);
	const intervalRef = useRef<number | null>(null);
	const bidsMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const asksMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const parserRef = useRef<any>(null);

	const clearConnect = () => {
		if (wsRef.current) {
			console.log('WebSocket: закрываем старое соединение');
			wsRef.current.close();
			wsRef.current = null;
			candlestickDataRef.current = [];
			bidsMapRef.current.clear();
			asksMapRef.current.clear();
		}
	}

	// Подписка на события смены вебсокет соединения
	useEffect(() => {
		const handleConnectionChange = ({ wsUrl, topics, exchange }: { wsUrl: string, topics: string[], exchange: string } ) => {
			clearConnect();

			switch (exchange) {
				case "BINANCE": {
					parserRef.current = BinanceParser();
					break;
				}
				case "BYBIT": { 
					parserRef.current = BybitParser ();
					break; 
				}
			}

			const ws = new WebSocket(wsUrl);
		
			ws.onopen = () => {
				console.log("[WS] Cоединение создано");
				switch (exchange) {
					case "BINANCE": {
						const subscribeMessage = createBinanceSubscribeMessage(topics);
						ws.send(subscribeMessage);
						break;
					}
					case "BYBIT": { 
						const subscribeMessage = createBybitSubscribeMessage(topics);
						ws.send(subscribeMessage);
						break; 
					}
				}
			};

			ws.onmessage = (event) => {
				const msg = JSON.parse(event.data);

				switch (exchange) {
					case "BYBIT": {
						if (msg.data && Array.isArray(msg.data.b) && Array.isArray(msg.data.a)) {
							const { bids, asks } = parserRef.current.parseOrderBook(msg.data);

							if (msg.type === "snapshot") {
								bids.forEach(([price, amount]: [number, number]) => {
									bidsMapRef.current.set(price, { price, amount, total: price * amount });
								});

								asks.forEach(([price, amount]: [number, number]) => {
									asksMapRef.current.set(price, { price, amount, total: price * amount })
								});
							} else if (msg.type === "delta") {
								bids.forEach(([price, amount]: [number, number]) => {
									if (amount === 0) {
										bidsMapRef.current.delete(price);
									} else {
										bidsMapRef.current.set(price, { price, amount, total: price * amount });
									}
								});

								asks.forEach(([price, amount]: [number, number]) => {
									if (amount === 0) {
										asksMapRef.current.delete(price);
									} else {
										asksMapRef.current.set(price, { price, amount, total: price * amount });
									}
								});
							}
						}
						break;	
					}
					case "BINANCE": {
						// Нелля
						break;
					}
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
			const bids = Array.from(bidsMapRef.current.values()).sort((a, b) => b.price - a.price);
			const asks = Array.from(asksMapRef.current.values()).sort((a, b) => a.price - b.price);
			
			if (bids.length > 0 || asks.length > 0) {
				eventEmitter.emit(EVENTS.ORDERBOOK_UPDATE, { bids, asks });
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