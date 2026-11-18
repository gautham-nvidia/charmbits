/** Attachment coordinates within the artwork, independent of image resolution. */
export interface CharmAttachment {
	x: number;
	y: number;
}

export const DEFAULT_ATTACHMENT: Readonly<CharmAttachment> = Object.freeze({ x: 0.5, y: 10 / 84 });

export interface FlowerConnection {
	attachment: CharmAttachment;
	baseAttachment: CharmAttachment;
	stemColour: number[];
	stemWidth: number;
}

/** Locate an exposed lower stalk; a petal or broad leaf must not become the stem join. */
export function flowerBaseFromPixels(
	width: number, height: number, rgba: Uint8Array, material: 'green' | 'wood' = 'green',
): FlowerConnection | undefined {
	let bottom = -1, sumX = 0, count = 0, widest = 0;
	const colour = [0, 0, 0];
	for (let y = height - 1; y >= 0 && (bottom < 0 || y >= bottom - 2); y--) {
		let row = 0;
		for (let x = 0; x < width; x++) {
			const offset = (y * width + x) * 4;
			if (rgba[offset + 3] < 190) { continue; }
			if (bottom < 0) { bottom = y; }
			sumX += x; count++; row++;
			for (let channel = 0; channel < 3; channel++) { colour[channel] += rgba[offset + channel]; }
		}
		widest = Math.max(widest, row);
	}
	if (!count || bottom < height * .7 || widest > width * .25) { return undefined; }
	const [red, green, blue] = colour.map(value => value / count);
	const stalk = material === 'wood' ? red > green && green > blue && red < 190
		: green > red * .9 && green > blue + 5 && Math.min(red, green, blue) < 170;
	if (!stalk) { return undefined; }
	const row = bottom - 1, averageX = sumX / count;
	let joinX = -1, distance = Infinity;
	for (let x = 0; x < width; x++) {
		if (rgba[(row * width + x) * 4 + 3] >= 190 && Math.abs(x - averageX) < distance) {
			joinX = x; distance = Math.abs(x - averageX);
		}
	}
	if (joinX < 0) { return undefined; }
	return {
		attachment: { x: .5, y: .005 },
		baseAttachment: { x: (joinX + .5) / width, y: (row + .5) / height },
		stemWidth: widest / width,
		stemColour: colour.map(value => Math.round(value / count)),
	};
}

export function attachmentFromPixels(width: number, height: number, rgba: Uint8Array): CharmAttachment {
	let bestScore = Number.POSITIVE_INFINITY;
	let sumX = 0;
	let sumY = 0;
	let count = 0;
	const center = (width - 1) / 2;
	const opaque = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height
		&& rgba[(y * width + x) * 4 + 3] >= 128;
	// Prefer the top of a central hook/head, rather than a raised ear or a side ring.
	// The upper half also keeps the attachment above the pendulum's center.
	for (let y = 0; y < height / 2 && y <= bestScore; y++) {
		for (let x = Math.floor(width * 0.35); x < Math.ceil(width * 0.65); x++) {
			if (!opaque(x, y)) { continue; }
			let neighbors = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (opaque(x + dx, y + dy)) { neighbors++; }
				}
			}
			if (neighbors < 3) { continue; }
			const score = y + Math.abs(x - center) * 2.5;
			if (score < bestScore) {
				bestScore = score;
				sumX = x; sumY = y; count = 1;
			} else if (score === bestScore && count === 1 && y === sumY && x === sumX + 1) {
				// Center adjacent pixels, but never average separate horns/hooks into a gap.
				sumX += x; sumY += y; count++;
			}
		}
	}
	if (!count) { return { ...DEFAULT_ATTACHMENT }; }
	const x = (sumX / count + 0.5) / width;
	let y = Math.min(0.5, (sumY / count + height / 84) / height);
	if (!opaque(Math.floor(x * width), Math.floor(y * height))) {
		// A slanted roof, cable or instrument neck can leave the column below
		// its top edge. Keep the inset on the silhouette rather than in a gap.
		let row = Math.floor(y * height);
		while (row > sumY / count && !opaque(Math.floor(x * width), row)) { row--; }
		y = (row + 0.5) / height;
	}
	return {
		x,
		// Let the line enter the silhouette by one logical pixel; the image covers it.
		y,
	};
}
