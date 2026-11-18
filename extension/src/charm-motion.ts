import type { EffectKind } from './charm-motion-view';
import registeredArtwork from './trial-charms.json';
import { isSoftCharm } from './charm-catalog';

interface MotionArtwork { id: string; artworkKey?: string; artworkHash?: string; bloom?: unknown; }

export const PET_BLINK_FILES: Readonly<Record<string, string>> = {
	'new-shiba-inu': 'motion-shiba-blink.png',
	'new-maine-coon': 'motion-maine-coon-blink.png',
	'new-lop-rabbit': 'motion-lop-rabbit-blink.png',
};

const effects: Readonly<Record<string, EffectKind>> = {
	'new-emerald': 'gem',
	'extra-gpu-tile': 'metal',
	'new-bonsai-tree': 'leaves',
	'new-diwali-diyas': 'flame',
	'new-crater-lake': 'water',
	'athlete-stephen-curry': 'curry',
	'artist-michael-jackson': 'mj',
	'new-shiba-inu': 'pet-dog',
	'new-maine-coon': 'pet-cat',
	'new-lop-rabbit': 'pet-rabbit',
};

/** Anatomical masks apply only to the registered artwork, never arbitrary imported photos. */
export function motionKind(charm: MotionArtwork): EffectKind | undefined {
	if (charm.bloom || charm.id.startsWith('live:') || charm.id.startsWith('fidget:')) { return undefined; }
	// Soft artwork already has a hold-to-squeeze surface; keep that visible.
	if (isSoftCharm(charm.id)) { return undefined; }
	if (charm.id.startsWith('pack:') && !registeredArtwork.some(item =>
		item.artworkKey === charm.artworkKey && item.artworkHash === charm.artworkHash)) { return 'sway'; }
	const key = charm.artworkKey ?? charm.id.replace(/^trial:/, '');
	return effects[key] ?? 'sway';
}

export function blinkFile(charm: MotionArtwork): string | undefined {
	if (!motionKind(charm)?.startsWith('pet-')) { return undefined; }
	return PET_BLINK_FILES[charm.artworkKey ?? charm.id.replace(/^trial:/, '')];
}
