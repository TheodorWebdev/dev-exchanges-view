export const EVENTS = {
    CANDLES_UPDATE: 'candles_update',
    ORDERBOOK_UPDATE: 'orderbook_update',
    EXCHANGE_SWITCH: 'exchange_switch',
    WEBSOCKET_CONNECTION_CHANGE: 'websocket_connection_change',
    CHANNEL_CHANGE: 'channel_change',
};

type EventListener = (...args: any[]) => void;

export class EventEmitter {
    private events: Record<string, EventListener[]> = {};

    on(event: string, listener: EventListener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);

        return () => {
            this.off(event, listener);
        };
    }

    off(event: string, listener: EventListener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(h => h !== listener);
    }

    emit(event: string, ...args: any[]) {
        const listeners = this.events[event];

        if (listeners) {
            listeners.forEach((listener) => listener(...args));
        }
    }

    removeAllListeners(event?: string) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

export const eventEmitter = new EventEmitter();
