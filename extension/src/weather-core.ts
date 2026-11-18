export const WEATHER_STATIONS = [
	{ id: 'KSFO', name: 'San Francisco (SFO)' },
	{ id: 'KSJC', name: 'San Jose (SJC)' },
	{ id: 'KOAK', name: 'Oakland (OAK)' },
	{ id: 'KPAO', name: 'Palo Alto (PAO)' },
	{ id: 'KNUQ', name: 'Mountain View (Moffett Field)' },
	{ id: 'KLAX', name: 'Los Angeles (LAX)' },
	{ id: 'KSAN', name: 'San Diego (SAN)' },
	{ id: 'KSEA', name: 'Seattle (SEA)' },
	{ id: 'KPDX', name: 'Portland (PDX)' },
	{ id: 'KAUS', name: 'Austin (AUS)' },
	{ id: 'KDFW', name: 'Dallas / Fort Worth (DFW)' },
	{ id: 'KDEN', name: 'Denver (DEN)' },
	{ id: 'KORD', name: 'Chicago (ORD)' },
	{ id: 'KJFK', name: 'New York (JFK)' },
	{ id: 'KBOS', name: 'Boston (BOS)' },
	{ id: 'KATL', name: 'Atlanta (ATL)' },
	{ id: 'KMIA', name: 'Miami (MIA)' },
	{ id: 'PHNL', name: 'Honolulu (HNL)' },
] as const;
export type WeatherStationId = typeof WEATHER_STATIONS[number]['id'];
export const WEATHER_CONDITIONS = ['sunny', 'night', 'cloudy', 'rain', 'snow', 'storm'] as const;
export type WeatherCondition = typeof WEATHER_CONDITIONS[number];
export const WEATHER_REFRESH_MS = 10 * 60 * 1000;
export const WEATHER_STALE_MS = 90 * 60 * 1000;
export interface WeatherSettings {
	version: 1;
	enabled: boolean;
	stationId: WeatherStationId;
	unit: 'c' | 'f';
}
export interface WeatherReading {
	stationId: WeatherStationId;
	observedAt: number;
	checkedAt: number;
	temperatureC: number;
	description: string;
	condition: WeatherCondition;
}
export interface WeatherSnapshot {
	settings: WeatherSettings;
	reading?: WeatherReading;
	status: 'disabled' | 'paused' | 'loading' | 'ready' | 'unavailable';
	stale: boolean;
	readOnly: boolean;
	error?: string;
}
export const DEFAULT_WEATHER: Readonly<WeatherSettings> = {
	version: 1, enabled: false, stationId: 'KSFO', unit: 'f',
};

export function parseWeatherSettings(value: unknown): WeatherSettings | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return undefined; }
	const raw = value as Partial<WeatherSettings>;
	if (raw.version !== 1 || typeof raw.enabled !== 'boolean' || !WEATHER_STATIONS.some(station => station.id === raw.stationId)
		|| raw.unit !== 'c' && raw.unit !== 'f') { return undefined; }
	return { version: 1, enabled: raw.enabled, stationId: raw.stationId!, unit: raw.unit };
}

export function matchesWeatherSettings(expected: WeatherSettings, actual: unknown): boolean {
	return JSON.stringify(expected) === JSON.stringify(parseWeatherSettings(actual));
}

export function weatherCondition(description: string, icon: unknown): WeatherCondition {
	let path = '';
	if (typeof icon === 'string' && icon.length <= 300) {
		try {
			const url = new URL(icon);
			if (url.protocol === 'https:' && url.hostname === 'api.weather.gov') { path = url.pathname; }
		} catch { /* A missing icon must not discard a valid temperature observation. */ }
	}
	if (/thunder|tornado/i.test(description) || /tsra|tornado/.test(path)) { return 'storm'; }
	if (/snow|sleet|hail/i.test(description) || /snow|sleet|blizzard/.test(path)) { return 'snow'; }
	if (/rain|drizzle|shower/i.test(description) || /rain|fzra/.test(path)) { return 'rain'; }
	if (/clear|fair|sunny/i.test(description) || /(?:\/|_)(?:skc|few|sct)(?:,|\/|$)/.test(path)) {
		return path.includes('/night/') ? 'night' : 'sunny';
	}
	return 'cloudy';
}

/** Keep station observations distinct from fetch time and reject absent or implausible readings. */
export function parseWeatherObservation(value: unknown, stationId: WeatherStationId, now: number): WeatherReading {
	const properties = value && typeof value === 'object' ? (value as { properties?: unknown }).properties : undefined;
	if (!properties || typeof properties !== 'object') { throw new Error('Missing weather observation.'); }
	const raw = properties as Record<string, unknown>;
	const temperature = raw.temperature as { unitCode?: unknown; value?: unknown } | null;
	const observedAt = typeof raw.timestamp === 'string' && raw.timestamp.length <= 40 ? Date.parse(raw.timestamp) : NaN;
	if (raw.station !== `https://api.weather.gov/stations/${stationId}` || !Number.isSafeInteger(observedAt)
		|| observedAt > now + 5 * 60 * 1000 || observedAt < now - 48 * 60 * 60 * 1000
		|| temperature?.unitCode !== 'wmoUnit:degC' || typeof temperature.value !== 'number'
		|| !Number.isFinite(temperature.value) || temperature.value < -100 || temperature.value > 70) {
		throw new Error('No recent, valid station temperature is available.');
	}
	const description = typeof raw.textDescription === 'string'
		? raw.textDescription.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 100) : 'Weather observation';
	return { stationId, observedAt, checkedAt: now, temperatureC: temperature.value,
		description, condition: weatherCondition(description, raw.icon) };
}

export function isWeatherReading(value: unknown, stationId: WeatherStationId): value is WeatherReading {
	if (!value || typeof value !== 'object') { return false; }
	const raw = value as Partial<WeatherReading>;
	return raw.stationId === stationId && Number.isSafeInteger(raw.observedAt) && Number.isSafeInteger(raw.checkedAt)
		&& raw.observedAt! >= 0 && raw.observedAt! <= Date.now() + 300000 && raw.checkedAt! >= 0 && raw.checkedAt! <= Date.now() + 300000
		&& typeof raw.temperatureC === 'number' && Number.isFinite(raw.temperatureC) && raw.temperatureC >= -100 && raw.temperatureC <= 70
		&& typeof raw.description === 'string' && raw.description.length <= 100 && WEATHER_CONDITIONS.some(kind => kind === raw.condition);
}

export function weatherTemperature(reading: WeatherReading, unit: WeatherSettings['unit']): string {
	const degrees = Math.round(unit === 'f' ? reading.temperatureC * 9 / 5 + 32 : reading.temperatureC);
	return `${degrees}\u00b0${unit.toUpperCase()}`;
}
