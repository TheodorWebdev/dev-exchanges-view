import { useEffect, useRef } from 'react';
import { eventEmitter, EVENTS } from '../utils/events';
import { BinanceParser, createBinanceSubscribeMessage } from '../exchanges/binance';
import type { Candle, KlineStreamDataBinance, OrderBookBinanceData } from '../utils/types';

export default function WebSocketComponent() {
	// Реактивное состояние через useRef
	const candlestickDataRef = useRef<Candle[]>([]);
	const wsRef = useRef<WebSocket | null>(null);
	const intervalRef = useRef<number | null>(null);
	const bidsMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const asksMapRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const parserRef = useRef(BinanceParser());

	// Подписка на события смены вебсокет соединения
	useEffect(() => {
		const handleConnectionChange = (wsUrl: string, topics: string[]) => {
			if (wsRef.current) {
				console.log('WebSocket: закрываем старое соединение');
				wsRef.current.close();
				wsRef.current = null;
			}

			// Очистка данных при переключении
			candlestickDataRef.current = [];
			bidsMapRef.current.clear();
			asksMapRef.current.clear();
			parserRef.current = BinanceParser();

			const ws = new WebSocket(wsUrl);
		
			ws.onopen = () => {
				// Используем функцию для создания сообщения подписки из binance.ts
				const subscribeMessage = createBinanceSubscribeMessage(topics);
				ws.send(subscribeMessage);
			};

			ws.onmessage = (event) => {
				const data = JSON.parse(event.data);
				
				// Обработка сообщений от Binance через BinanceParser
				if (data.stream) {
					const streamData = data.data;
					
					// Обработка candlestick data через BinanceParser
					if (streamData.k) {
						const klineData: KlineStreamDataBinance = {
							e: streamData.e,
							E: streamData.E,
							s: streamData.s,
							k: streamData.k
						};
						
						parserRef.current.parseCandlestick(klineData, (newCandles) => {
							if (typeof newCandles === 'function') {
								// Если это функция (prev => new), вызываем с текущим массивом
								candlestickDataRef.current = newCandles(candlestickDataRef.current);
							} else {
								// Если это массив
								candlestickDataRef.current = newCandles;
							}
						});
					}
					
					// Обработка order book data через BinanceParser
					if (streamData.b && streamData.a) {
						const orderBookData: OrderBookBinanceData = {
							e: streamData.e,
							E: streamData.E,
							s: streamData.s,
							U: streamData.U,
							u: streamData.u,
							b: streamData.b,
							a: streamData.a,
						};
						
						parserRef.current.parseOrderBook(
							orderBookData,
							(bids) => {
								bidsMapRef.current = new Map(bids.map(item => [item.price, item]));
							},
							(asks) => {
								asksMapRef.current = new Map(asks.map(item => [item.price, item]));
							}
						);
					}
				}
			};

			ws.onclose = (event) => {
				if (event.wasClean) {
					console.log(`Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
				} else {
					// например, сервер убил процесс или сеть недоступна
					console.log(' Соединение прервано');
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

		intervalRef.current = setInterval(() => {
			// Инициализация событий: candlestick data
			if (candlestickDataRef.current.length > 0) {
				eventEmitter.emit(EVENTS.CANDLES_UPDATE, [...candlestickDataRef.current]);
			}

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