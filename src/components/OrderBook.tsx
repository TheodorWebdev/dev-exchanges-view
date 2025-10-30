import { useEffect, useState } from 'react';

import { HStack, Card, Heading, Box, Separator, Flex } from '@chakra-ui/react';
import type {OrderBookTypes} from "@/utils/types.ts";
import {eventEmitter, EVENTS} from "@/utils/events.ts";

// interface OrderBook {
// 	b: Array<[string, string]>,
// 	a: Array<[string, string]>,
// }
//
// // mock (remove soon)
// const mockOrderBookData: OrderBook = {
// 	b: Array.from({ length: 50 }, () => ["30247.20", "30.028"]),
// 	a: Array.from({ length: 50 }, () => ["30248.21", "30.038"]),
// };

export default function OrderBook() {
	const [bids, setBids] = useState<OrderBookTypes[]>([]);
	const [asks, setAsks] = useState<OrderBookTypes[]>([]);

	useEffect(() => {
		const updateHandler = ({ bids, asks }: { bids: OrderBookTypes[]; asks: OrderBookTypes[] }) => {
			setBids(bids.slice(0, 50));
			setAsks(asks.slice(0, 50));
		};

		eventEmitter.on(EVENTS.ORDERBOOK_UPDATE, updateHandler);

		return () => {
			eventEmitter.off(EVENTS.ORDERBOOK_UPDATE, updateHandler);
		};
	}, []);

	return (
		<Card.Root w="30vw" h="90vh">
			<Card.Header borderBottomWidth="1px">
				<HStack
					w="100%"
					justifyContent="space-between"
					pb="4"
				>
					<Heading w="30%">Price</Heading>
					<Heading w="30%">Amount</Heading>
					<Heading w="33%">Total</Heading>
				</HStack>
			</Card.Header>
			<Card.Body overflowY="hidden">
				<Flex w="100%" h="45%" flexDirection="column-reverse" overflowY="scroll">
					{bids.map(({ price, amount, total }, i) => (
						<HStack key={i} justifyContent="space-between">
							<Box color="red.600" w="30%">{price.toFixed(2)}</Box>
							<Box color="gray.400" w="30%">{amount.toFixed(3)}</Box>
							<Box color="orange.200" w="30%">{total.toFixed(2)}</Box>
						</HStack>
					))}
				</Flex>

				<Separator mt="4" mb="4" size="md" />

				<Flex w="100%" h="45%" flexDirection="column" overflowY="scroll">
					{asks.map(({ price, amount, total }, i) => (
						<HStack key={i} justifyContent="space-between">
							<Box color="green.600" w="30%">{price.toFixed(2)}</Box>
							<Box color="gray.400" w="30%">{amount.toFixed(3)}</Box>
							<Box color="orange.200" w="30%">{total.toFixed(2)}</Box>
						</HStack>
					))}
				</Flex>
			</Card.Body>
		</Card.Root>
	);
};