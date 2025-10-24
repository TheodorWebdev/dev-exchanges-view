import { useRef, useEffect, useState } from 'react';

import { HStack, Card, Heading, Box, Text, Separator } from '@chakra-ui/react';

interface OrderBook {
	b: Array<[string, string]>,
	a: Array<[string, string]>,
}

// mock (remove soon)
const mockOrderBookData: OrderBook = {
	b: Array.from({ length: 50 }, () => ["30247.20", "30.028"]),
	a: Array.from({ length: 50 }, () => ["30248.21", "30.038"]),
};

export default function OrderBook() {
	const bidsRef = useRef<HTMLDivElement>(null);
	const [ isUserScroll, setIsUserScroll ] = useState(false);

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
				<Box 
					ref={bidsRef} 
					onScroll={handleScroll} 
					w="100%" 
					flex="1" 
					overflowY="auto"
				>
					<HStack
						fontWeight="700" 
						w="100%" 
						justifyContent="space-between"
						alignItems="flex-start"
					>
						<Box color="red.600" w="30%">
							{mockOrderBookData.b.map(([price], index) => (
								<Text key={index}>{price}</Text>
							))}
						</Box>

						<Box color="gray.400" w="30%">
							{mockOrderBookData.b.map(([,amount], index) => (
								<Text key={index}>{amount}</Text>
							))}
						</Box>

						<Box color="orange.200" w="30%">
							{mockOrderBookData.b.map(([price, amount], index) => (
								<Text key={index}>{(parseFloat(amount) * parseFloat(price)).toFixed(2)}</Text>
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
						<Box color="green.600" w="30%">
							{mockOrderBookData.a.map(([price], index) => (
								<Text key={index}>{price}</Text>
							))}
						</Box>

						<Box color="gray.400" w="30%">
							{mockOrderBookData.a.map(([,amount], index) => (
								<Text key={index}>{amount}</Text>
							))}
						</Box>

						<Box color="orange.200" w="30%">
							{mockOrderBookData.a.map(([price, amount], index) => (
								<Text key={index}>{(parseFloat(amount) * parseFloat(price)).toFixed(2)}</Text>
							))}
						</Box>
					</HStack>
				</Box>
			</Card.Body>
		</Card.Root>
	);
};