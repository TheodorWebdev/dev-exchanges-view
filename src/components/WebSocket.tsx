import { useEffect, useRef } from 'react';

import { BinanceSocketParser } from '@/exchanges/binance';
import { BybitSocketParser } from '@/exchanges/bybit';
import { ProbitSocketParser } from '@/exchanges/probit.ts';

import { eventEmitter, EVENTS } from '@/utils/events';
import {type Candle, type OrderBookTypes} from '@/utils/types';

export default function WebSocketComponent() {
	const candlestickDataRef = useRef<Candle[]>([]);
	const wsRef = useRef<WebSocket | null>(null);
	const bidsRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const asksRef = useRef<Map<number, { price: number; amount: number; total: number }>>(new Map());
	const parserRef = useRef<any>(BinanceSocketParser);

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

	const updateOrderBook = (parsed_msg: any) => {
		if (parsed_msg.type === "snapshot") {
			bidsRef.current.clear();
			parsed_msg.bids.forEach((el: OrderBookTypes) => {
				bidsRef.current.set(el.price, {
					price: el.price,
					amount: el.amount,
					total: el.price * el.amount,
				});
			});

			asksRef.current.clear();
			parsed_msg.asks.forEach((el: OrderBookTypes) => {
				asksRef.current.set(el.price, {
					price: el.price,
					amount: el.amount,
					total: el.price * el.amount,
				});
			});
		}

		if (parsed_msg.type === "delta") {
			parsed_msg.bids.forEach((el: OrderBookTypes) => {
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

			parsed_msg.asks.forEach((el: OrderBookTypes) => {
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
	}

	const updateCandleStick = (parsed_msg: any) => {
		const prevCandle = candlestickDataRef.current[candlestickDataRef.current.length - 1];

		if (prevCandle && parsed_msg.time < prevCandle.time) {
			return;
		}

		if (prevCandle && prevCandle.time === parsed_msg.time) {
			candlestickDataRef.current = [
				...candlestickDataRef.current.slice(0, -1),
				parsed_msg
			];
		} else {
			candlestickDataRef.current = [
				...candlestickDataRef.current,
				parsed_msg
			];
		}
	}

	// Подписка на события смены вебсокет соединения
	useEffect(() => {
		const handleConnectionChange = ({ wsUrl, exchange, pair, interval }: { wsUrl: string, exchange: string, pair: string, interval: string } ) => {
			clearConnect();
			// currentIntervalRef.current = interval;
			// currentExchangeRef.current = exchange;

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
					break;
				}
			}

			const parser = parserRef.current;
			const ws = new WebSocket(wsUrl);

			ws.onopen = async () => {
				console.log("[WS] Cоединение создано");

				const msg = await parser.sub_msg(pair, interval)
				ws.send(msg);

				parser.startPing(ws);

				if (parser.cs_loadhistory) {
					try {
						const history = await parser.cs_loadhistory(ws, pair, interval);

						if (history.length > 0) {
							candlestickDataRef.current = history;
							eventEmitter.emit(EVENTS.CANDLES_UPDATE, { type: 'init', candles: history, interval: interval });
						}
					} catch (error) {
						console.error('Error: ', error);
					}
				}
			};

			ws.onmessage = async (event) => {
				const isPongMsg = await parserRef.current.pong(ws, event);
				if (isPongMsg) return;

				const ob_parsed = await parserRef.current.ob_parse(ws, event);
				if (ob_parsed) {
					updateOrderBook(ob_parsed);
				}

				const cs_parsed = await parserRef.current.cs_parse(ws, event);
				if (cs_parsed) {
					updateCandleStick(cs_parsed);
				}
			};

			ws.onclose = (event) => {
				parser.stopPing();
				
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
		const updateInterval = 1000;

		const candlesInterval = setInterval(() => {
			// Инициализация событий: candlestick data
			const lastCandle = candlestickDataRef.current[candlestickDataRef.current.length - 1];
			if (lastCandle) {
				eventEmitter.emit(EVENTS.CANDLES_UPDATE, lastCandle);
    		}	
		}, updateInterval);

		const orderbookInterval = setInterval(() => {
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
			clearInterval(candlesInterval);
    		clearInterval(orderbookInterval);
		};
	}, []);

	return null;
};