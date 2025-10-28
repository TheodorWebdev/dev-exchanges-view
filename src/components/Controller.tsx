import GenericSelector from "./GenericSelector.tsx";
import {HStack} from "@chakra-ui/react";
import { PAIRS } from '../utils/pairs';
import { INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D } from '../utils/exchanges';

const Controller = () => {
    const exchanges = ["BINANCE", "BYBIT"];
    const pairs = PAIRS.map(p => p.symbol);
    const intervals = [INTERVAL_1M, INTERVAL_5M, INTERVAL_15M, INTERVAL_1H, INTERVAL_1D];

    return (
        <HStack>
            <GenericSelector
                value={"BINANCE"}
                setValue={() => {}}
                options={exchanges}
            />

            <GenericSelector
                value={"BTCUSDT"}
                setValue={() => {}}
                options={pairs}
            />

            <GenericSelector
                value={"1m"}
                setValue={() => {}}
                options={intervals}
            />
        </HStack>
    );
};

export default Controller;
