import { useEffect, useRef, useState } from 'react';
import { Card, Flex, HStack, Text, Box } from '@chakra-ui/react';

import { CandlestickSeries, createChart, HistogramSeries } from 'lightweight-charts';
import type { ISeriesApi, CandlestickData, UTCTimestamp, HistogramData } from 'lightweight-charts';

import { eventEmitter, EVENTS } from '@/utils/events';
import type { Candle } from '@/utils/types';

type CandlestickSeries = ISeriesApi<'Candlestick'>;
type VolumeSeries = ISeriesApi<'Histogram'>;

export default function TradingChart() {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const candleSeriesRef = useRef<CandlestickSeries | null>(null);
	const [hoverData, setHoverData] = useState<any>(null);
	const currentIntervalRef = useRef<string>("");

	const volumeSeriesRef = useRef<VolumeSeries | null>(null);

	useEffect(() => {
		if (!chartContainerRef.current) return;

		const chart = createChart(chartContainerRef.current, {
			layout: {
				background: { color: '#111' },
				textColor: '#DDD',
			},
			grid: {
				vertLines: { color: '#1e1e1e' },
				horzLines: { color: '#1e1e1e' },
			},
			timeScale: {
				borderColor: '#333',
				timeVisible: true,
				secondsVisible: false,
				tickMarkFormatter: (time: number) => {
					const date = new Date(time * 1000);

					if (currentIntervalRef.current === '1d') {
						const day = date.getUTCDate();
						const month = date.getUTCMonth();
						const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
						return `${day} ${months[month]}`;
					} else {
						const hours = date.getUTCHours();
						const minutes = date.getUTCMinutes().toString().padStart(2, '0');
						return `${hours}:${minutes}`;
					}
				},
			},
			rightPriceScale: { borderColor: '#333' },
			autoSize: true,
		});

		const candleSeries = chart.addSeries(CandlestickSeries ,{
			upColor: '#26a69a',
			downColor: '#ef5350',
			borderVisible: false,
			wickUpColor: '#26a69a',
			wickDownColor: '#ef5350',
		});

		const volumeSeries = chart.addSeries(HistogramSeries, {
			color: '#74b9ff',
			priceFormat: {
				type: 'volume',
			},
			priceScaleId: 'left',
			priceLineVisible: false,
		});

		chart.priceScale('left').applyOptions({
			scaleMargins: {
				top: 0.8,
				bottom: 0,
			},
		});

		const candlesUpdateHandler = (data: any) => {
			if (data.type === 'init') {
				if (data.candles.length === 0) {
					candleSeries.setData([]);
					volumeSeries.setData([]);
				} else {
					const chartData: CandlestickData[] = data.candles.map((c: Candle) => ({
						time: c.time as UTCTimestamp,
						open: c.open,
						high: c.high,
						low: c.low,
						close: c.close,
					}));

					const volumeData: HistogramData[] = data.candles.map((c: Candle) => ({
						time: c.time as UTCTimestamp,
						value: c.volume || 0,
						color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
					}));

					candleSeries.setData(chartData);
					volumeSeries.setData(volumeData);
					currentIntervalRef.current = data.interval;
					chart.timeScale().fitContent();
				}
			} else {
				const newCandle: Candle = data;
				candleSeries.update({
					time: newCandle.time as UTCTimestamp,
					open: newCandle.open,
					high: newCandle.high,
					low: newCandle.low,
					close: newCandle.close,
				});
				
				volumeSeries.update({
					time: newCandle.time as UTCTimestamp,
					value: newCandle.volume,
					color: newCandle.close >= newCandle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
				});
			}
		};

		eventEmitter.on(EVENTS.CANDLES_UPDATE, candlesUpdateHandler);

		candleSeriesRef.current = candleSeries;
		volumeSeriesRef.current = volumeSeries;

		chart.subscribeCrosshairMove((param) => {
			if (
				!param.time ||
				!param.seriesData.size ||
				!candleSeriesRef.current ||
				!volumeSeriesRef.current 
			) {
				setHoverData(null);
				return;
			}

			const candleData = param.seriesData.get(candleSeriesRef.current) as CandlestickData;
			const volumeData = param.seriesData.get(volumeSeriesRef.current) as HistogramData;
			
		
			if (candleData && volumeData) {
				setHoverData({
					...candleData,
					...volumeData,
				});
			}
		});

		return () => {
			eventEmitter.off(EVENTS.CANDLES_UPDATE, candlesUpdateHandler); 
			chart.remove();
		}
	}, []);

	return (
		<Card.Root w="60vw" h="70vh">
			<Card.Body >
				<Flex w="100%" justify="space-between" mb={2} p={2} bg="gray.800" borderRadius="md" fontSize="sm" >
					{hoverData ? (
						<HStack>
							<Text color="teal.300">Open: {hoverData.open.toFixed(2)}</Text>
							<Text color="teal.300">High: {hoverData.high.toFixed(2)}</Text>
							<Text color="teal.300">Low: {hoverData.low.toFixed(2)}</Text>
							<Text color="teal.300">Close: {hoverData.close.toFixed(2)}</Text>
						</HStack>
					) : (
						<Text color="gray.400">Point to candle...</Text>
					)}
				</Flex>

				<Box ref={chartContainerRef} w="100%" h="90%" borderRadius="md" overflow="hidden" textAlign="center" />
			</Card.Body>
		</Card.Root>
	);
};