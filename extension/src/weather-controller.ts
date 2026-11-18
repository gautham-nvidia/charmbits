import { StateWriter } from './state-writer';
import { fetchWeatherObservation } from './weather-client';
import {
	DEFAULT_WEATHER, matchesWeatherSettings, parseWeatherSettings, WEATHER_REFRESH_MS, WEATHER_STALE_MS,
	type WeatherReading, type WeatherSettings, type WeatherSnapshot, type WeatherStationId,
} from './weather-core';

interface WeatherOptions {
	saved: unknown;
	storage: { read(): Promise<unknown>; write(settings: WeatherSettings): Promise<void> };
	unreadable?: boolean;
	request?: (stationId: WeatherStationId, signal: AbortSignal) => Promise<WeatherReading>;
	clock?: { now(): number; set(callback: () => void, delay: number): unknown; clear(timer: unknown): void };
}

/** Optional station requests run only while the host is visible; workspace contents never enter this controller. */
export class WeatherController {
	private settings: WeatherSettings;
	private reading: WeatherReading | undefined;
	private error: string | undefined;
	private visible = false;
	private closed = false;
	private loading = false;
	private generation = 0;
	private nextCheck = 0;
	private timer: unknown;
	private abort: AbortController | undefined;
	private queue: Promise<unknown> = Promise.resolve();
	private readonly writer: StateWriter<WeatherSettings>;
	private readonly listeners = new Set<(snapshot: WeatherSnapshot) => void>();
	private readonly readOnly: boolean;
	private readonly request: NonNullable<WeatherOptions['request']>;
	private readonly clock: NonNullable<WeatherOptions['clock']>;

	constructor(options: WeatherOptions) {
		this.settings = parseWeatherSettings(options.saved) ?? { ...DEFAULT_WEATHER };
		const version = options.saved && typeof options.saved === 'object' ? (options.saved as { version?: unknown }).version : undefined;
		this.readOnly = options.unreadable === true || typeof version === 'number' && version > 1;
		if (this.readOnly) { this.error = 'Weather settings could not be read. The saved file has been preserved.'; }
		this.request = options.request ?? fetchWeatherObservation;
		this.clock = options.clock ?? { now: Date.now, set: (callback, delay) => setTimeout(callback, delay),
			clear: timer => clearTimeout(timer as ReturnType<typeof setTimeout>) };
		this.writer = new StateWriter(value => options.storage.write(value), () => options.storage.read(), matchesWeatherSettings);
	}

	snapshot(): WeatherSnapshot {
		return { settings: { ...this.settings }, ...(this.reading ? { reading: { ...this.reading } } : {}),
			status: !this.settings.enabled ? 'disabled' : !this.visible ? 'paused' : this.loading ? 'loading'
				: this.error ? 'unavailable' : this.reading ? 'ready' : 'loading',
			stale: !!this.reading && this.clock.now() - this.reading.observedAt > WEATHER_STALE_MS,
			readOnly: this.readOnly, ...(this.error ? { error: this.error } : {}) };
	}

	subscribe(listener: (snapshot: WeatherSnapshot) => void): () => void {
		this.listeners.add(listener); listener(this.snapshot());
		return () => { this.listeners.delete(listener); };
	}

	private emit() {
		for (const listener of this.listeners) {
			try { listener(this.snapshot()); } catch { /* A closed view must not stop the weather scheduler. */ }
		}
	}

	private stop() {
		if (this.timer !== undefined) { this.clock.clear(this.timer); this.timer = undefined; }
		this.generation++;
		this.abort?.abort(); this.abort = undefined; this.loading = false;
	}

	setVisible(visible: boolean) {
		if (this.closed || visible === this.visible) { return; }
		this.visible = visible;
		const interrupted = this.loading;
		this.stop();
		if (interrupted) { this.nextCheck = 0; }
		this.emit();
		if (visible) { this.schedule(); }
	}

	async configure(value: unknown): Promise<boolean> {
		const next = parseWeatherSettings(value);
		if (!next || this.readOnly || this.closed) { return false; }
		const operation = this.queue.catch(() => undefined).then(async () => {
			if (this.closed) { return false; }
			if (matchesWeatherSettings(this.settings, next)) { return true; }
			try {
				await this.writer.save(next);
				const reconnect = this.settings.stationId !== next.stationId || this.settings.enabled !== next.enabled;
				if (this.settings.stationId !== next.stationId) { this.reading = undefined; }
				this.settings = next;
				if (reconnect) { this.stop(); this.nextCheck = 0; this.error = undefined; }
				this.emit(); this.schedule();
				return true;
			} catch {
				this.emit(); return false;
			}
		});
		this.queue = operation;
		return operation;
	}

	private schedule() {
		if (this.closed || !this.visible || !this.settings.enabled || this.readOnly || this.loading) { return; }
		if (this.timer !== undefined) { this.clock.clear(this.timer); }
		this.timer = this.clock.set(() => { this.timer = undefined; void this.refresh(); },
			Math.max(0, Math.min(WEATHER_REFRESH_MS, this.nextCheck - this.clock.now())));
	}

	private async refresh() {
		if (this.closed || !this.visible || !this.settings.enabled || this.loading) { return; }
		const generation = ++this.generation;
		this.abort = new AbortController();
		this.loading = true; this.nextCheck = this.clock.now() + WEATHER_REFRESH_MS; this.emit();
		try {
			const reading = await this.request(this.settings.stationId, this.abort.signal);
			if (generation !== this.generation || this.closed) { return; }
			this.reading = reading; this.error = undefined;
		} catch {
			if (generation !== this.generation || this.closed) { return; }
			this.error = 'The weather service is unavailable. Another check is scheduled in ten minutes.';
		} finally {
			if (generation === this.generation && !this.closed) {
				this.abort = undefined; this.loading = false; this.emit(); this.schedule();
			}
		}
	}

	async flush() { await this.queue.catch(() => undefined); await this.writer.flush(); }
	async dispose() { this.closed = true; this.stop(); this.listeners.clear(); await this.flush(); }
}
