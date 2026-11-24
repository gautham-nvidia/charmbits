import {
	DEFAULT_WEATHER, isWeatherReading, parseWeatherSettings, WEATHER_STATIONS, WEATHER_STALE_MS, weatherTemperature,
	type WeatherCondition, type WeatherSettings, type WeatherSnapshot,
} from './weather-core';

interface WeatherViewOptions {
	send(settings: WeatherSettings, requestId: number): void;
	condition(value: WeatherCondition | undefined): void;
}

export function createWeatherView(options: WeatherViewOptions) {
	const required = <T extends HTMLElement>(id: string) => {
		const element = document.getElementById(id);
		if (!element) { throw new Error(`Missing weather element: ${id}`); }
		return element as T;
	};
	const panel = required<HTMLDetailsElement>('weather-settings');
	const enabled = required<HTMLInputElement>('weather-enabled');
	const station = required<HTMLSelectElement>('weather-station');
	const unit = required<HTMLSelectElement>('weather-unit');
	const save = required<HTMLButtonElement>('weather-save');
	const feedback = required<HTMLParagraphElement>('weather-feedback');
	const summary = required<HTMLDivElement>('weather-summary');
	const value = required<HTMLElement>('weather-value');
	const time = required<HTMLElement>('weather-time');
	const status = required<HTMLElement>('weather-status');
	for (const place of WEATHER_STATIONS) { station.add(new Option(place.name, place.id)); }
	let snapshot: WeatherSnapshot = { settings: { ...DEFAULT_WEATHER }, status: 'disabled', stale: false, readOnly: false };
	let selected = '', ready = false, dirty = false, pending = 0, sequence = 0;
	const setText = (node: HTMLElement, text: string) => { if (node.textContent !== text) { node.textContent = text; } };
	for (const input of [enabled, station, unit]) { input.addEventListener('change', () => { dirty = true; }); }

	function render() {
		const nimbus = selected === 'live:cloud';
		panel.hidden = !nimbus;
		summary.hidden = !nimbus || !snapshot.settings.enabled;
		save.disabled = !ready || snapshot.readOnly || !!pending;
		if (!dirty && !pending) {
			enabled.checked = snapshot.settings.enabled; station.value = snapshot.settings.stationId; unit.value = snapshot.settings.unit;
		}
		const reading = snapshot.reading;
		const stale = snapshot.stale || !!reading && Date.now() - reading.observedAt > WEATHER_STALE_MS;
		const connected = snapshot.settings.enabled && nimbus;
		options.condition(connected ? reading && !stale ? reading.condition : 'cloudy' : undefined);
		let description = 'Weather is off. Choose a US station and save to connect.';
		let heading = snapshot.status === 'loading' ? 'Checking the weather...' : 'Weather unavailable';
		let detail = snapshot.error ?? 'US National Weather Service';
		if (reading && snapshot.settings.enabled) {
			heading = `${weatherTemperature(reading, snapshot.settings.unit)} \u00b7 ${reading.description}`;
			const observed = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
				.format(reading.observedAt);
			detail = `${reading.stationId} \u00b7 ${stale ? 'Older observation' : 'Observed'} ${observed}`;
			if (snapshot.status === 'unavailable') { detail += ' \u00b7 Connection unavailable'; }
			description = `${heading}. ${detail}.`;
		} else if (snapshot.settings.enabled) {
			description = snapshot.status === 'paused' ? 'Updates pause while CharmBits is hidden.' : `${heading}. ${detail}`;
		}
		if (snapshot.readOnly) { description = snapshot.error ?? 'Saved weather settings are unavailable.'; }
		setText(value, heading); setText(time, detail); setText(status, description);
		// The stage ResizeObserver handles real size changes. A weather receipt
		// must not cancel an unrelated drag when the layout has not changed.
	}

	save.addEventListener('click', () => {
		const settings = parseWeatherSettings({ version: 1, enabled: enabled.checked, stationId: station.value, unit: unit.value });
		if (!settings || pending || snapshot.readOnly || !ready) { return; }
		pending = ++sequence; save.disabled = true; setText(feedback, 'Saving weather settings...');
		options.send(settings, pending);
	});
	return {
		setCharm(id: string) { if (selected !== id) { selected = id; render(); } },
		receive(raw: unknown) {
			if (!raw || typeof raw !== 'object') { return; }
			const incoming = raw as Partial<WeatherSnapshot>, settings = parseWeatherSettings(incoming.settings);
			if (!settings || !['disabled', 'paused', 'loading', 'ready', 'unavailable'].includes(incoming.status ?? '')) { return; }
			snapshot = { settings, status: incoming.status!, stale: incoming.stale === true, readOnly: incoming.readOnly === true,
				...(isWeatherReading(incoming.reading, settings.stationId) ? { reading: incoming.reading } : {}),
				...(typeof incoming.error === 'string' ? { error: incoming.error.slice(0, 200) } : {}) };
			ready = true; render();
		},
		result(id: number, error?: string) {
			if (id !== pending) { return; }
			pending = 0;
			if (!error) { dirty = false; }
			setText(feedback, error ?? 'Weather settings saved.'); render();
		},
	};
}
