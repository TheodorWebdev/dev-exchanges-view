import { useRef, useEffect, useState } from 'react';

import { HStack, Card, Heading, Box, Separator } from '@chakra-ui/react';
import type {OrderBookTypes} from "../utils/types.ts";
import {eventEmitter, EVENTS} from "../utils/events.ts";

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
	const bidsRef = useRef<HTMLDivElement>(null);
	const [ isUserScroll, setIsUserScroll ] = useState(false);

	const [bids, setBids] = useState<OrderBookTypes[]>([]);
	const [asks, setAsks] = useState<OrderBookTypes[]>([]);

	const handleScroll = () => {
		const container = bidsRef.current;
		if (!container) return;

		const isScrolledToBottom = (container.scrollHeight - container.scrollTop) <= (container.clientHeight + 1);

		if (!isScrolledToBottom) {
		setIsUserScroll(true);
		} else {
		setIsUserScroll(false);
		}
	};

	useEffect(() => {
		const container = bidsRef.current;
		if (!container || isUserScroll) return;

		container.scrollTop = container.scrollHeight - container.clientHeight;

	}, [isUserScroll]);

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
				<Box ref={bidsRef} onScroll={handleScroll} w="100%" flex="1" overflowY="auto">
					<HStack fontWeight="700" w="100%" justifyContent="space-between" alignItems="flex-start">
						<Box w="100%">
							{bids.map(({ price, amount, total }, i) => (
								<Box display="flex" flexDirection="column" key={i}>
									<HStack justifyContent="space-between">
										<Box color="red.600" w="30%">{price.toFixed(2)}</Box>
										<Box color="gray.400" w="30%">{amount.toFixed(3)}</Box>
										<Box color="orange.200" w="30%">{total.toFixed(2)}</Box>
									</HStack>
								</Box>
							))}
						</Box>
					</HStack>
				</Box>

				<Separator mt="4" mb="4" size="md" />

				<Box w="100%" flex="1" overflowY="auto">
					<HStack
						fontWeight="700"
						w="100%"
						justifyContent="space-between"
						alignItems="flex-start"
					>
						<Box w="100%">
							{asks.map(({ price, amount, total }, i) => (
								<Box display="flex" flexDirection="column" key={i}>
									<HStack justifyContent="space-between">
										<Box color="green.600" w="30%">{price.toFixed(2)}</Box>
										<Box color="gray.400" w="30%">{amount.toFixed(3)}</Box>
										<Box color="orange.200" w="30%">{total.toFixed(2)}</Box>
									</HStack>
								</Box>
							))}
						</Box>
					</HStack>
				</Box>
			</Card.Body>
		</Card.Root>
	);
};