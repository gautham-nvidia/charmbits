import { parseWeatherObservation, WEATHER_STATIONS, type WeatherReading, type WeatherStationId } from './weather-core';

const MAX_OBSERVATION_BYTES = 128 * 1024;

async function observationJson(response: Response): Promise<unknown> {
	if (!response.ok || !response.body) { throw new Error(`Weather service returned ${response.status}.`); }
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const chunk = await reader.read();
			if (chunk.done) { break; }
			size += chunk.value.length;
			if (size > MAX_OBSERVATION_BYTES) { throw new Error('Weather response exceeded its size limit.'); }
			chunks.push(chunk.value);
		}
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}

export async function fetchWeatherObservation(
	stationId: WeatherStationId, signal: AbortSignal, request: typeof fetch = fetch,
): Promise<WeatherReading> {
	if (!WEATHER_STATIONS.some(station => station.id === stationId)) { throw new Error('Unknown weather station.'); }
	const response = await request(`https://api.weather.gov/stations/${stationId}/observations/latest`, {
		headers: { Accept: 'application/geo+json', 'User-Agent': 'CharmBits/0.16 (https://charmbits.pages.dev; getcharmlet@gmail.com)' },
		redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
	});
	return parseWeatherObservation(await observationJson(response), stationId, Date.now());
}
