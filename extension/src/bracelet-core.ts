export const BRACELET_STYLES = {
	silver: 'Silver links',
	gold: 'Gold links',
	'rose-gold': 'Rose gold links',
	woven: 'Woven linen',
	pearl: 'Pearl strand',
} as const;
export type BraceletStyle = keyof typeof BRACELET_STYLES;
export interface BraceletState { charms: readonly string[]; selected: number; style: BraceletStyle; }
export const DEFAULT_BRACELET: Readonly<BraceletState> = Object.freeze({ charms: Object.freeze([]), selected: 0, style: 'silver' });

export interface BraceletReturnMotion { fromLength: number; fromAngle: number; elapsedMs: number; }

/** Retract the cord and unwind the pendant by at most half a turn. */
export function braceletReturnPose(motion: Readonly<BraceletReturnMotion>, restLength: number) {
	const duration = Math.max(650, Math.min(1400, Math.abs(restLength - motion.fromLength) * 2));
	const progress = Math.max(0, Math.min(1, motion.elapsedMs / duration));
	const eased = progress * progress * (3 - 2 * progress);
	const turn = Math.atan2(Math.sin(motion.fromAngle), Math.cos(motion.fromAngle));
	return { length: motion.fromLength + (restLength - motion.fromLength) * eased,
		angle: motion.fromAngle - turn * eased, complete: progress === 1 };
}

export function isBraceletStyle(value: unknown): value is BraceletStyle {
	return typeof value === 'string' && Object.hasOwn(BRACELET_STYLES, value);
}

/** Keep saved slots even when a pack is temporarily unavailable or desktop access expires. */
export function restoreBracelet(value: unknown): BraceletState {
	if (!value || typeof value !== 'object') { return { ...DEFAULT_BRACELET }; }
	const candidate = value as Partial<BraceletState>;
	const charms = Array.isArray(candidate.charms) ? candidate.charms.filter(id =>
		typeof id === 'string' && id.length > 0 && id.length <= 160 && !/[\u0000-\u001f\u007f]/.test(id)).slice(0, 3) : [];
	const selected = Number.isInteger(candidate.selected) ? Math.max(0, Math.min(charms.length - 1, candidate.selected!)) : 0;
	return { charms, selected, style: isBraceletStyle(candidate.style) ? candidate.style : DEFAULT_BRACELET.style };
}

export function matchesBracelet(expected: BraceletState, actual: unknown): boolean {
	if (!actual || typeof actual !== 'object') { return false; }
	const saved = actual as Partial<BraceletState>;
	return (saved.style ?? DEFAULT_BRACELET.style) === expected.style
		&& saved.selected === expected.selected && Array.isArray(saved.charms)
		&& saved.charms.length === expected.charms.length && saved.charms.every((id, index) => id === expected.charms[index]);
}
