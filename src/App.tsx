import { Provider } from './components/ui/provider';
import { HStack } from '@chakra-ui/react';

import TradingChart from './components/TradingChart';
import OrderBook from './components/OrderBook';

function App() {

  return (
    <Provider>
      <HStack w="100vw" h="100vh" justifyContent="center" alignItems="center" gap={5}>
        <OrderBook />
        <TradingChart />
      </HStack>
    </Provider>
  );
};

export default App;
