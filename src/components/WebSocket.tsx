import { useEffect, useRef } from 'react'

type CandlestickData = { 
	time: string, 
	open: number, 
	high: number, 
	low: number, 
	close: number 
};

type OrderBook = {
	s: string,
	b: Map<string, string>,
	a: Map<string, string>,
	u: string,
	seq: string,
};


export default function WebSocketComponent(wsUrl: string) {
	const candlestickDataRef = useRef<CandlestickData[]>([]);
	const orderbookRef = useRef<OrderBook | null>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const connect = () => {
			if (wsRef.current) {
				wsRef.current.close();
			}

			const ws = new WebSocket(wsUrl);
		
			ws.onopen = () => {

			};

			ws.onmessage = () => {

			};

			ws.onclose = () => {

			};

			ws.onerror = () => {

			};

			wsRef.current = ws;
		};

	}, [])
};