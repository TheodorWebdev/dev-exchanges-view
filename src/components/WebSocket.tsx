import { useEffect, useRef } from 'react';
import { eventEmitter, EVENTS } from '../utils/events';
import { BinanceParser, createBinanceSubscribeMessage } from '../exchanges/binance';
import { BybitParser } from '../exchanges/bybit';
import type { Candle, OrderBookTypes } from '../utils/types';
import { createBybitSubscribeMessage } from '../exchanges/bybit'

export default function WebSocketComponent() {
	// Реактивное состояние через useRef
	const candlestickDataRef = useRef<Candle[]>([]);
	const wsRef = useRef<WebSocket | null>(null);
	const intervalRef = useRef<number | null>(null);
	const bidsMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const asksMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const parserRef = useRef(BybitParser());

	// Подписка на события смены вебсокет соединения
	useEffect(() => {
		const handleConnectionChange = ({ wsUrl, topics, exchange }: { wsUrl: string, topics: string[], exchange: string } ) => {
			if (wsRef.current) {
				console.log('WebSocket: закрываем старое соединение');
				wsRef.current.close();
				wsRef.current = null;
			}

			console.log(exchange);
			// Очистка данных при переключении
			candlestickDataRef.current = [];
			bidsMapRef.current.clear();
			asksMapRef.current.clear();
			parserRef.current = BybitParser();

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
				const data = JSON.parse(event.data);

				// Обработка данных от Bybit
				if (exchange === 'BYBIT') {
					if (data.topic && data.data && Array.isArray(data.data.b) && Array.isArray(data.data.a)) {
						// Вызываем парсер Bybit
						parserRef.current.parseOrderBook(
							data.data,
							data.type,
							(bids: OrderBookTypes[]) => {
								bidsMapRef.current = new Map(bids.map(item => [item.price, item]));
							},
							(asks: OrderBookTypes[]) => {
								asksMapRef.current = new Map(asks.map(item => [item.price, item]));
							}
						);
					}
				}
				// Обработка данных от Binance — ваш текущий код
				else {
				// ваш текущий код для Binance
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
		const updateInterval = 500; // 500 миллисекунд
		console.log('WebSocket: useEffect с интервалом запущен');

		intervalRef.current = setInterval(() => {
			// Инициализация событий: candlestick data
			if (candlestickDataRef.current.length > 0) {
				eventEmitter.emit(EVENTS.CANDLES_UPDATE, [...candlestickDataRef.current]);
			}

			// Инициализация событий: order book
			const bids = Array.from(bidsMapRef.current.values()).sort((a, b) => b.price - a.price);
			const asks = Array.from(asksMapRef.current.values()).sort((a, b) => a.price - b.price);
			
			if (bids.length > 0 || asks.length > 0) {
				console.log('WebSocket: отправляем обновление стакана:', { bids, asks });
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