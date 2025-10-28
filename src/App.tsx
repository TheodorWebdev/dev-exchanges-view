import { Provider } from './components/ui/provider';
import { HStack } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

import TradingChart from './components/TradingChart';
import OrderBook from './components/OrderBook';
import WebSocketComponent from './components/WebSocket'
import Controller from './components/Controller'

function App() {
  // const wsUrl = exchange === 'binance' 
  //   ? 'wss://stream.binance.com:9443/ws/btcusdt@kline_1m'
  //   : 'wss://stream.bybit.com/v5/public/linear';

  return (
    <Provider>
      <HStack w="100vw" h="100vh" justifyContent="center" alignItems="center" gap={5}>
        <OrderBook />
        <TradingChart />
      </HStack>

      <Controller wsUrl={'wss://stream.bybit.com/v5/public/linear'} topics={['orderbook.50.BTCUSDT']} />
      <WebSocketComponent />
    </Provider>
  );
};

export default App;
