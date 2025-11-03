import { useLayoutEffect, useRef, useState } from 'react';

import { Card, Flex, HStack, Text, Box } from '@chakra-ui/react';

import { CandlestickSeries, createChart, HistogramSeries } from 'lightweight-charts';
import type { ISeriesApi, CandlestickData, HistogramData, UTCTimestamp } from 'lightweight-charts';

import { eventEmitter, EVENTS } from '@/utils/events'
import type { Candle } from '@/utils/types'
import { loadHistory } from '@/utils/helpersFunctions';

type CandlestickSeries = ISeriesApi<'Candlestick'>;
type VolumeSeries = ISeriesApi<'Histogram'>;

export default function TradingChart() {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const candleSeriesRef = useRef<CandlestickSeries | null>(null);
  	const volumeSeriesRef = useRef<VolumeSeries | null>(null);
	const [hoverData, setHoverData] = useState<any>(null);

	useLayoutEffect(() => {
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
			timeScale: { borderColor: '#333' },
			rightPriceScale: { borderColor: '#333' },
		});

		const candleSeries = chart.addSeries(CandlestickSeries ,{
			upColor: '#26a69a',
			downColor: '#ef5350',
			borderVisible: false,
			wickUpColor: '#26a69a',
			wickDownColor: '#ef5350',
		});

		const volumeSeries = chart.addSeries(HistogramSeries, {
			priceFormat: { type: 'volume' },
			priceScaleId: '', // отдельная шкала
		});

		// после создания задаём scaleMargins через applyOptions
		chart.priceScale('').applyOptions({
			scaleMargins: {
				top: 0.8,
				bottom: 0,
			},
		});

		async function loadHistory() {
			try {
				const response = await fetch(
					`https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=1&limit=200`
				);
				const data = await response.json();

				if (data.retCode === 0) {
					const candles = data.result.list.map(([time, open, high, low, close]: [string, string, string, string, string]) => ({
						time: Number(time) / 1000 as UTCTimestamp,
						open: Number(open),
						high: Number(high),
						low: Number(low),
						close: Number(close),
					})).sort((a, b) => a.time - b.time);

					candleSeries.setData(candles);
				}
			} catch (error) {
				console.error('Ошибка загрузки истории:', error);
			}
		}

		loadHistory();

		// Подписываемся на обновления свечей
		const candlesUpdateHandler = (newCandle: Candle) => {
			const chartData: CandlestickData = {
				time: newCandle.time as UTCTimestamp,
				open: newCandle.open,
				high: newCandle.high,
				low: newCandle.low,
				close: newCandle.close,
			};

			candleSeries.update(chartData);
		};

		eventEmitter.on(EVENTS.CANDLES_UPDATE, candlesUpdateHandler);

		candleSeriesRef.current = candleSeries;
		volumeSeriesRef.current = volumeSeries;

		// --- Tooltip при наведении ---
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
				volume: volumeData.value,
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
						<Text color="teal.300">O: {hoverData.open.toFixed(2)}</Text>
						<Text color="teal.300">H: {hoverData.high.toFixed(2)}</Text>
						<Text color="teal.300">L: {hoverData.low.toFixed(2)}</Text>
						<Text color="teal.300">C: {hoverData.close.toFixed(2)}</Text>
						<Text color="cyan.400">V: {hoverData.volume?.toFixed(0)}</Text>
					</HStack>
					) : (
					<Text color="gray.400">Наведите на свечу...</Text>
					)}
				</Flex>

				<Box ref={chartContainerRef} w="100%" h="100%" borderRadius="md" overflow="hidden" />
			</Card.Body>
		</Card.Root>
	);
};