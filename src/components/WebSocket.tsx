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


export default function WebSocketComponent() {
	const candlestickDataRef = useRef<CandlestickData[]>([]);
	const orderbookRef = useRef<OrderBook | null>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const handleConnect = (e: CustomEvent) => {
			const { wsUrl, topics } = e.detail;

			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}

			const ws = new WebSocket(wsUrl);
		
			ws.onopen = () => {
				ws.send(JSON.stringify({
					op: 'subscribe',
					args: [topics],
				}))
			};

			ws.onmessage = (event) => {
				console.log('Получено сообщение:', event.data);
			};

			ws.onclose = () => {
				console.log('WebSocket отключён');
			};

			ws.onerror = (error) => {
				console.error('Ошибка WebSocket:', error);
			};

			wsRef.current = ws;
		};

		window.addEventListener('wsConnect', handleConnect as EventListener);

		return () => {
			window.removeEventListener('wsConnectionRequest', handleConnect as EventListener);
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [])

	return null;
};