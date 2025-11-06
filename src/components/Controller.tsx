import { useState, useEffect } from 'react';
import { HStack } from "@chakra-ui/react";

import GenericSelector from "@/components/GenericSelector";

import {
    INTERVAL_1M,
    INTERVAL_5M,
    INTERVAL_15M,
    INTERVAL_1H,
    INTERVAL_1D,
    SOCKET_URLS,
    EXCHANGES
} from '@/utils/exchanges';
import { eventEmitter, EVENTS } from '@/utils/events';
import { PAIRS } from '@/utils/pairs';

const Controller = () => {
    const exchanges = [EXCHANGES.BINANCE, EXCHANGES.BYBIT, EXCHANGES.PROBIT];
    const pairs = PAIRS.map(p => p.symbol);
    const intervals = [INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D];

    const [exchange, setExchange] = useState<string>(EXCHANGES.BINANCE);
	const [pair, setPair] = useState<string>("BTC/USDT");
	const [interval, setInterval] = useState<string>("1m");

    useEffect(() => {
        const wsUrl = SOCKET_URLS[exchange as keyof typeof SOCKET_URLS];
        eventEmitter.emit(EVENTS.CANDLES_UPDATE, { type: 'init', candles: [] });

        setTimeout(() => {
            eventEmitter.emit(EVENTS.WEBSOCKET_CONNECTION_CHANGE, { wsUrl, exchange, pair, interval });
        }, 0);
    }, [exchange, pair, interval]);

    useEffect(() => {
        eventEmitter.emit(EVENTS.ORDERBOOK_UPDATE, JSON.stringify(''));
    }, [exchange, pair]);

    return (
        <HStack>
            <GenericSelector
                value={exchange}
                setValue={setExchange}
                options={exchanges}
            />

            <GenericSelector
                value={pair}
                setValue={setPair}
                options={pairs}
            />

            <GenericSelector
                value={interval}
                setValue={setInterval}
                options={intervals}
            />
        </HStack>
    );
};

export default Controller;
