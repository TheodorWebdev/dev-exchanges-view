import { useState, useEffect } from 'react';
import { HStack } from "@chakra-ui/react";

import GenericSelector from "@/components/GenericSelector.tsx";

import { INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D, SOCKET_URLS } from '@/utils/exchanges';
import { eventEmitter, EVENTS } from '@/utils/events';
import { PAIRS } from '@/utils/pairs';

const Controller = () => {	
    const exchanges = ["BINANCE", "BYBIT"];
    const pairs = PAIRS.map(p => p.symbol);
    const intervals = [INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D];

	const [exchange, setExchange] = useState<string>("BINANCE");
	const [pair, setPair] = useState<string>("BTCUSDT");
	const [interval, setInterval] = useState<string>("1m");

    useEffect(() => {
        const wsUrl = SOCKET_URLS[exchange as keyof typeof SOCKET_URLS];

        const topics = exchange === "BINANCE"
            ? [`${pair.toLowerCase()}@kline_${interval}`, `${pair.toLowerCase()}@depth100ms`]
            : [`kline.${interval[0]}.${pair}`, `orderbook.50.${pair}`];

        setTimeout(() => {
            eventEmitter.emit(EVENTS.WEBSOCKET_CONNECTION_CHANGE, { wsUrl, topics, exchange });
        }, 1000);
    }, [exchange, pair, interval]);

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
