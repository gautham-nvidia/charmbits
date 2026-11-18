import type { CharmAttachment } from './charm-attachment';

export interface BloomShape { x: number; y: number; radiusX: number; radiusY: number; }
export const BLOOM_COLUMNS = 8;
export const BLOOM_ROWS = 10;
const bounded = (value: number) => Math.max(0, Math.min(1, value));
const rounded = (value: number) => Math.round(value * 10000) / 10000;

/** Locate the coloured or pale petals without including the green stem and leaves. */
export function bloomFromPixels(width: number, height: number, pixels: Uint8Array): BloomShape {
	let left = width, top = height, right = 0, bottom = 0, count = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const offset = (y * width + x) * 4;
			const red = pixels[offset], green = pixels[offset + 1], blue = pixels[offset + 2];
			if (pixels[offset + 3] < 160 || !(red > green * 1.13 || blue > green * 1.12
				|| Math.min(red, green, blue) > 145)) { continue; }
			left = Math.min(left, x); right = Math.max(right, x);
			top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
		}
	}
	if (count < 8) { return { x: .5, y: .65, radiusX: .4, radiusY: .3 }; }
	return { x: rounded((left + right) / 2 / width), y: rounded((top + bottom) / 2 / height),
		radiusX: rounded(Math.max(.08, (right - left + 1) / 2 / width)),
		radiusY: rounded(Math.max(.08, (bottom - top + 1) / 2 / height)) };
}

/** Bend the petal surface while leaving the mesh rows around the stem join fixed. */
export function bloomPoint(point: readonly [number, number], shape: BloomShape, hook: CharmAttachment,
	pose: { seconds: number; opening: number; sway: number }): readonly [number, number] {
	const [x, y] = point;
	const lowerStem = hook.y > shape.y;
	const fixedLine = lowerStem ? Math.floor((hook.y - .035) * BLOOM_ROWS) / BLOOM_ROWS
		: Math.ceil((hook.y + .035) * BLOOM_ROWS) / BLOOM_ROWS;
	const fromStem = lowerStem ? fixedLine - y : y - fixedLine;
	if (fromStem <= 0) { return point; }
	const dx = x - shape.x, dy = y - shape.y;
	const radius = Math.hypot(dx / shape.radiusX, dy / shape.radiusY);
	const rootFade = bounded(fromStem / .16);
	const ring = Math.min(1, radius * 2) * Math.exp(-Math.max(0, radius - .9) * 4) * rootFade;
	const time = Number.isFinite(pose.seconds) ? pose.seconds : 0;
	const opening = bounded(Number.isFinite(pose.opening) ? pose.opening : 0);
	const breathe = Math.sin(time * .85) * .018 + opening * .12;
	const depth = Math.max(0, 1 - radius * radius) * rootFade;
	const sway = Math.max(-1, Math.min(1, Number.isFinite(pose.sway) ? pose.sway : 0));
	const tilt = Math.sin(time * .43) * .008 + sway * .02;
	return [x + dx * ring * breathe + depth * tilt,
		y + dy * ring * breathe + depth * Math.sin(time * .57) * .005];
}
