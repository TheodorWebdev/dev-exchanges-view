import { useEffect } from 'react';

export default function Controller({ wsUrl, topics }: { wsUrl: string, topics: string[] }) {
  useEffect(() => {
	console.log('Controller: отправляем событие с параметрами:', { wsUrl, topics });
    // Отправляем кастомное событие с новым состоянием
    window.dispatchEvent(
		new CustomEvent('wsConnectionChange', { 
			detail: { wsUrl, topics },
		}));
  }, [wsUrl, topics]);

  return null;
}