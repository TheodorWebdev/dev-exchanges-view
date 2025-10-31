import { useEffect, useState, useRef } from 'react';

import { HStack, Card, Heading, Box, Separator, Flex } from '@chakra-ui/react';
import { eventEmitter, EVENTS } from "@/utils/events.ts";
import { checksumCRC32 } from '@/utils/checksum';
import type { OrderBookTypes } from "@/utils/types.ts";

export default function OrderBook() {
	const [orderBookData, setOrderBookData] = useState<{ bids: OrderBookTypes[]; asks: OrderBookTypes[] } | null>(null);
	const lastChecksumRef = useRef<number | null>(null);

	useEffect(() => {
		const updateHandler = (rawData: string) => {
			const currentChecksum = checksumCRC32(rawData);

			if (lastChecksumRef.current === null || lastChecksumRef.current !== currentChecksum) {
				try {
					const parsedData = JSON.parse(rawData);
					setOrderBookData(parsedData);
					lastChecksumRef.current = currentChecksum;
				} catch (e) {
					console.error('Ошибка при парсинге данных:', e);
				}
			}
		};

		eventEmitter.on(EVENTS.ORDERBOOK_UPDATE, updateHandler);

		return () => {
			eventEmitter.off(EVENTS.ORDERBOOK_UPDATE, updateHandler);
		};
	}, []);

	if (!orderBookData) {
		return (
			<Card.Root w="30vw" h="70vh" justifyContent="center" alignItems="center">
				<Box>Loading...</Box>
			</Card.Root>
		)
	}

	return (
		<Card.Root w="30vw" h="70vh">
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
			<Card.Body overflowY="hidden" fontWeight="700">
				<Flex w="100%" h="50%" flexDirection="column-reverse" overflowY="scroll">
					{orderBookData.bids.map(({ price, amount, total }, i) => (
						<HStack key={i} justifyContent="space-between">
							<Box color="red.600" w="30%">{price.toFixed(2)}</Box>
							<Box color="gray.400" w="30%">{amount}</Box>
							<Box color="orange.200" w="30%">{total.toFixed(2)}</Box>
						</HStack>
					))}
				</Flex>

				<Separator mt="4" mb="4" size="md" />

				<Flex w="100%" h="50%" flexDirection="column" overflowY="scroll">
					{orderBookData.asks.map(({ price, amount, total }, i) => (
						<HStack key={i} justifyContent="space-between">
							<Box color="green.600" w="30%">{price.toFixed(2)}</Box>
							<Box color="gray.400" w="30%">{amount}</Box>
							<Box color="orange.200" w="30%">{total.toFixed(2)}</Box>
						</HStack>
					))}
				</Flex>
			</Card.Body>
		</Card.Root>
	);
};