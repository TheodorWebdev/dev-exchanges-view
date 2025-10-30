import { useEffect, useRef } from 'react';

import { BybitParser, createBybitSubscribeMessage } from '@/exchanges/bybit';
import { BinanceSocketParser } from '@/exchanges/binance';

import { eventEmitter, EVENTS } from '@/utils/events';
import type {Candle} from '@/utils/types';
import {updateOrderBookLevels} from "@/utils/helpersFunctions.ts";

export default function WebSocketComponent() {
	const candlestickDataRef = useRef<Candle[]>([]);
	const wsRef = useRef<WebSocket | null>(null);
	const intervalRef = useRef<number | null>(null);
	const bidsMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const asksMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const parserRef = useRef<any>(null);
	const lastUpdateId = useRef<number | null>(null);

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
					parserRef.current = new BinanceSocketParser();
					break;
				}
				case "BYBIT": {
					parserRef.current = BybitParser();
					break;
				}
			}

			const ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				console.log("[WS] Cоединение создано");
				switch (exchange) {
					case "BINANCE": {
						const parser = parserRef.current as BinanceSocketParser;

						parser.ob_sub_msg(topics[0]).then(msg => ws.send(msg));
						parser.ob_sub_msg(topics[1]).then(msg => ws.send(msg));
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
								updateOrderBookLevels(bidsMapRef.current, bids);
								updateOrderBookLevels(asksMapRef.current, asks);
							}
						}
						break;
					}
					case "BINANCE": {
						// Если пришёл первый снапшот через lastUpdateId
						if (msg.lastUpdateId) {
							const { bids, asks } = parserRef.current.parseOrderBook(msg);

							bids.forEach(([price, amount]: [number, number]) => {
								bidsMapRef.current.set(price, { price, amount, total: price * amount });
							});

							asks.forEach(([price, amount]: [number, number]) => {
								asksMapRef.current.set(price, { price, amount, total: price * amount });
							});

							lastUpdateId.current = msg.lastUpdateId;
							return;
						}

						// Если пришла дельта
						if (msg.U !== undefined && msg.u !== undefined && msg.b && msg.a) {
							// Пропущенные обновления
							if (msg.U > lastUpdateId.current! + 1) {
								bidsMapRef.current.clear();
								asksMapRef.current.clear();
								lastUpdateId.current = msg.u;
								return;
							}

							// Применяем дельту
							updateOrderBookLevels(bidsMapRef.current, msg.b);
							updateOrderBookLevels(asksMapRef.current, msg.a);

							lastUpdateId.current = msg.u;
						}
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
			const bids = Array.from(bidsMapRef.current.values()).sort((a, b) => b.price - a.price).slice(0, 50);
			const asks = Array.from(asksMapRef.current.values()).sort((a, b) => a.price - b.price).slice(0, 50);

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