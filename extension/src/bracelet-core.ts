export interface BraceletState { charms: readonly string[]; selected: number; }
export const DEFAULT_BRACELET: Readonly<BraceletState> = Object.freeze({ charms: Object.freeze([]), selected: 0 });

/** Keep saved slots even when a pack is temporarily unavailable or desktop access expires. */
export function restoreBracelet(value: unknown): BraceletState {
	if (!value || typeof value !== 'object') { return { ...DEFAULT_BRACELET }; }
	const candidate = value as Partial<BraceletState>;
	const charms = Array.isArray(candidate.charms) ? candidate.charms.filter(id =>
		typeof id === 'string' && id.length > 0 && id.length <= 160 && !/[\u0000-\u001f\u007f]/.test(id)).slice(0, 3) : [];
	const selected = Number.isInteger(candidate.selected) ? Math.max(0, Math.min(charms.length - 1, candidate.selected!)) : 0;
	return { charms, selected };
}

export function matchesBracelet(expected: BraceletState, actual: unknown): boolean {
	if (!actual || typeof actual !== 'object') { return false; }
	const saved = actual as Partial<BraceletState>;
	return saved.selected === expected.selected && Array.isArray(saved.charms)
		&& saved.charms.length === expected.charms.length && saved.charms.every((id, index) => id === expected.charms[index]);
}
