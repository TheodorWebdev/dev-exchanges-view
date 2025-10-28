import GenericSelector from "./GenericSelector.tsx";
import {HStack} from "@chakra-ui/react";
import { PAIRS } from '../utils/pairs';
import { INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D } from '../utils/exchanges';

import { useState, useEffect } from 'react';
import { eventEmitter, EVENTS } from '../utils/events';

const Controller = () => {	
    const exchanges = ["BINANCE", "BYBIT"];
    const pairs = PAIRS.map(p => p.symbol);
    const intervals = [INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D];

	const [exchange, setExchange] = useState<string>("BYBIT");
	const [pair, setPair] = useState<string>("BTCUSDT");
	const [interval, setInterval] = useState<string>("1m");

	const wsUrl = exchange === "BINANCE"
		? `wss://stream.binance.com:9443/ws`
		: `wss://stream.bybit.com/v5/public/spot`;

	const topics = exchange === "BINANCE"
		? [`${pair.toLowerCase()}@kline_${interval}`, `${pair.toLowerCase()}@depth100ms`]
		: [`kline.${interval[0]}.${pair}`, `orderbook.50.${pair}`];

	useEffect(() => {
		eventEmitter.emit(EVENTS.WEBSOCKET_CONNECTION_CHANGE, { wsUrl, topics, exchange });

	}, [wsUrl, topics, exchange]);

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
