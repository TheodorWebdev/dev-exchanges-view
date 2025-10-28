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
				console.log('WebSocket: закрываем старое соединение');
				wsRef.current.close();
				wsRef.current = null;
			}

			const ws = new WebSocket(wsUrl);
		
			ws.onopen = () => {
				console.log('WebSocket: соединение открыто');
				topics.forEach((topic: string) => {
					ws.send(JSON.stringify({ op: 'subscribe', args: [topic] }))
				});
			};

			ws.onmessage = (event) => {
				console.log('Получено сообщение:', event.data);
			};

			ws.onclose = (event) => {
				if (event.wasClean) {
					alert(`[close] Соединение закрыто чисто, код=${event.code} причина=${event.reason}`);
				} else {
					// например, сервер убил процесс или сеть недоступна
					// обычно в этом случае event.code 1006
					alert('[close] Соединение прервано');
				}
			};

			ws.onerror = (error) => {
				console.error('Ошибка WebSocket:', error);
			};

			wsRef.current = ws;
		};

		window.addEventListener('wsConnectionChange', handleConnect as EventListener);

		return () => {
			window.removeEventListener('wsConnectionChange', handleConnect as EventListener);
			if (wsRef.current) {
				console.log('WebSocket: закрываем соединение при размонтировании');
				wsRef.current.close();
			}
		};
	}, [])

	return null;
};