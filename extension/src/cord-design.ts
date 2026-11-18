import { isSoftCharm, RETIRED_CHARMS, WITHHELD_CHARMS, type CharmDefinition } from './charm-catalog';

export const CORD_STYLES = {
	thread: 'Simple thread',
	soft: 'Soft cord',
	braid: 'Braided cord',
	leather: 'Leather cord',
	ribbon: 'Satin ribbon',
	linen: 'Natural linen',
	silk: 'Slate silk',
	stem: 'Leafy stem',
	'silver-chain': 'Silver chain',
	'gold-chain': 'Gold chain',
	'ball-chain': 'Ball chain',
	'rose-gold-chain': 'Rose gold chain',
	pearls: 'Pearl strand',
} as const;
export type CordStyle = keyof typeof CORD_STYLES;
export type CordChoices = Readonly<Record<string, CordStyle>>;
const CALIFORNIA_CORDS: Readonly<Record<string, CordStyle>> = {
	'live:cali': 'braid', 'live:redwood': 'leather', 'live:yosemite': 'leather', 'live:tahoe': 'silver-chain',
	'live:gull': 'soft', 'live:seal': 'soft', 'live:golden-gate': 'ball-chain', 'live:santa-cruz': 'braid',
	'live:whale': 'soft', 'live:dolphin': 'soft', 'live:condor': 'leather', 'live:eagle': 'leather',
};

export function isCordStyle(value: unknown): value is CordStyle {
	return typeof value === 'string' && Object.hasOwn(CORD_STYLES, value);
}

export function restoreCordChoices(value: unknown, charms: readonly CharmDefinition[]): CordChoices {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return {}; }
	const raw = value as Record<string, unknown>;
	const entries: Array<[string, CordStyle]> = [];
	const retained = WITHHELD_CHARMS.filter(saved => !charms.some(charm => charm.id === saved.id || charm.artworkKey === saved.artworkKey));
	for (const charm of [...charms, ...retained]) {
		if (entries.length >= 512) { break; }
		const artworkId = charm.artworkKey ? `trial:${charm.artworkKey}` : charm.id;
		const retired = Object.entries(RETIRED_CHARMS).filter(([, current]) => current === artworkId).map(([id]) => id);
		const key = [charm.id, artworkId, ...retired].find(id => Object.hasOwn(raw, id) && isCordStyle(raw[id]));
		if (key) { entries.push([charm.id, raw[key] as CordStyle]); }
	}
	return Object.fromEntries(entries);
}

export function cordForCharm(charm: CharmDefinition, choices: CordChoices = {}): CordStyle {
	if (Object.hasOwn(choices, charm.id) && isCordStyle(choices[charm.id])) { return choices[charm.id]; }
	if (Object.hasOwn(CALIFORNIA_CORDS, charm.id)) { return CALIFORNIA_CORDS[charm.id]; }
	if (isSoftCharm(charm.id) || charm.group === 'Stress Busters') { return 'soft'; }
	switch (charm.group) {
		case 'Live Companions':
			return 'silver-chain';
		case 'Gemstones':
		case 'Personal Keepsakes':
		case 'My Photos':
			return 'gold-chain';
		case 'Sacred Traditions':
		case 'Local Culture':
		case 'Luck & Little Joys':
			return 'braid';
		case 'Compute & Silicon':
		case 'Test Bench':
		case 'AI':
			return 'ball-chain';
		case 'Garden Flowers':
		case 'Grown by you':
		case 'Flowers':
			return 'stem';
		case 'Seasonal':
		case 'Celebrations':
			return 'ribbon';
		case 'Music':
			return /acoustic|ukulele|violin/.test(charm.id) ? 'leather' : 'silver-chain';
		case 'California':
			return /granite|mountain|cypress/.test(charm.id) ? 'leather' : 'silver-chain';
		case 'Solar System':
		case 'Stars & Galaxies':
		case 'Zodiac':
			return 'silver-chain';
		case 'Animals':
			return 'linen';
		case 'World Wonders':
			return 'silver-chain';
		case 'Trees & Forests':
		case 'National Parks':
			return 'linen';
		case 'Sports':
			return 'leather';
		default:
			return 'thread';
	}
}

export interface CordPoint { x: number; y: number; }
const number = (value: number) => value.toFixed(2);

function cordControl(anchor: CordPoint, hook: CordPoint, bend: number): CordPoint {
	const dx = hook.x - anchor.x, dy = hook.y - anchor.y;
	const distance = Math.hypot(dx, dy) || 1;
	const limit = Math.min(64, distance * .3);
	const offset = Number.isFinite(bend) ? Math.max(-limit, Math.min(limit, bend)) : 0;
	return { x: anchor.x + dx * .45 - dy / distance * offset, y: (anchor.y + hook.y) / 2 + dx / distance * offset };
}

export function cordPath(anchor: CordPoint, hook: CordPoint, bend = 0): string {
	const control = cordControl(anchor, hook, bend);
	return `M ${anchor.x} ${anchor.y} Q ${control.x} ${control.y} ${hook.x} ${hook.y}`;
}

/** Bounded link geometry follows the same quadratic curve as the attachment path. */
export function chainLinks(anchor: CordPoint, hook: CordPoint, balls = false, bend = 0): string {
	const dx = hook.x - anchor.x, dy = hook.y - anchor.y;
	const distance = Math.hypot(dx, dy);
	if (!Number.isFinite(distance) || distance < 8) { return ''; }
	const count = Math.min(180, Math.floor(distance / (balls ? 6 : 5)));
	const { x: controlX, y: controlY } = cordControl(anchor, hook, bend);
	const paths: string[] = [];
	for (let index = 1; index < count; index++) {
		const t = index / count, u = 1 - t;
		const x = u * u * anchor.x + 2 * u * t * controlX + t * t * hook.x;
		const y = u * u * anchor.y + 2 * u * t * controlY + t * t * hook.y;
		const tx = u * (controlX - anchor.x) + t * (hook.x - controlX);
		const ty = u * (controlY - anchor.y) + t * (hook.y - controlY);
		const length = Math.hypot(tx, ty) || 1;
		const radius = balls ? 1.6 : index % 2 ? 1.65 : .8;
		const nx = -ty / length * radius, ny = tx / length * radius;
		const rotation = Math.atan2(ty, tx) * 180 / Math.PI - 90;
		const a = `${number(x + nx)} ${number(y + ny)}`, b = `${number(x - nx)} ${number(y - ny)}`;
		const arc = `${radius} ${balls ? radius : 2.8} ${number(rotation)} 0 1`;
		paths.push(`M ${a} A ${arc} ${b} A ${arc} ${a}`);
	}
	return paths.join(' ');
}

export interface StemLeaf { blade: string; fold: string; veins: string; }

/** Curved leaf surfaces keep their root on the stem while their tips flutter independently. */
export function stemFoliage(anchor: CordPoint, hook: CordPoint, bend = 0, seconds = 0): readonly StemLeaf[] {
	const distance = Math.hypot(hook.x - anchor.x, hook.y - anchor.y);
	if (!Number.isFinite(distance) || distance < 24) { return []; }
	const count = Math.min(7, Math.max(2, Math.floor(distance / 38)));
	const size = Math.min(22, Math.max(12, distance * .12));
	const control = cordControl(anchor, hook, bend);
	const leaves: StemLeaf[] = [];
	const time = Number.isFinite(seconds) ? seconds : 0;
	for (let index = 0; index < count; index++) {
		const t = .2 + index / Math.max(1, count - 1) * .63, u = 1 - t;
		const x = u * u * anchor.x + 2 * u * t * control.x + t * t * hook.x;
		const y = u * u * anchor.y + 2 * u * t * control.y + t * t * hook.y;
		const dx = u * (control.x - anchor.x) + t * (hook.x - control.x);
		const dy = u * (control.y - anchor.y) + t * (hook.y - control.y);
		const length = Math.hypot(dx, dy) || 1, side = index % 2 ? 1 : -1;
		const flutter = time ? Math.sin(time * .78 + index * 1.7) * .08 : 0;
		const tx = dx / length, ty = dy / length, nx = -ty * side, ny = tx * side;
		const point = (out: number, along: number) => {
			const width = out * (1 + flutter), slope = along + out * flutter * .65;
			return `${number(x + size * (nx * width + tx * slope))} ${number(y + size * (ny * width + ty * slope))}`;
		};
		const root = point(0, 0), tip = point(.98, -.6);
		const blade = `M ${root} C ${point(.13, -.52)} ${point(.49, -.77)} ${tip}`
			+ ` C ${point(.91, -.06)} ${point(.38, .16)} ${root} Z`;
		const fold = `M ${root} Q ${point(.48, -.22)} ${tip}`
			+ ` C ${point(.91, -.06)} ${point(.38, .16)} ${root} Z`;
		const veins = [`M ${root} Q ${point(.48, -.22)} ${tip}`];
		for (const part of [.22, .4, .58]) {
			veins.push(`M ${point(part, -part * .5)} Q ${point(part + .03, -part * .5 - .1)} ${point(part + .09, -part * .5 - .18)}`);
			veins.push(`M ${point(part, -part * .5)} Q ${point(part + .1, -part * .5 + .03)} ${point(part + .16, -part * .5 + .05)}`);
		}
		leaves.push({ blade, fold, veins: veins.join(' ') });
	}
	return leaves;
}

/** The static silhouette remains useful for bounds and attachment checks. */
export function stemLeaves(anchor: CordPoint, hook: CordPoint, bend = 0): { leaves: string; veins: string } {
	const leaves = stemFoliage(anchor, hook, bend);
	return { leaves: leaves.map(leaf => leaf.blade).join(' '), veins: leaves.map(leaf => leaf.veins).join(' ') };
}
