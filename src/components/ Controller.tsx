import { useEffect } from 'react';

export default function Controller({ wsUrl, topics }: { wsUrl: string, topics: string[] }) {
  useEffect(() => {
    // Отправляем кастомное событие с новым состоянием
    window.dispatchEvent(
		new CustomEvent('wsConnectionChange', { 
			detail: { wsUrl, topics },
		}));
  }, [wsUrl, topics]);
}