import { Provider } from './components/ui/provider';
import { HStack, VStack, Box } from '@chakra-ui/react';

import TradingChart from './components/TradingChart';
import OrderBook from './components/OrderBook';
import Controller from "./components/Controller.tsx";
import WebSocketComponent from "./components/WebSocket.tsx";

function App() {
  // const wsUrl = exchange === 'binance' 
  //   ? 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m'
  //   : 'wss://stream.bybit.com/v5/public/linear';

    return (
        <Provider>
            <WebSocketComponent/>
            <VStack w="100vw" h="100vh">
                <Box mt={4}>
                    <Controller />
                </Box>

                <HStack w="100vw" h="100vh" justifyContent="center" alignItems="center" gap={5}>
                    <OrderBook />
                    <TradingChart />
                </HStack>
            </VStack>
        </Provider>
    );
}

export default App;
