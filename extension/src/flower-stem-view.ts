import { DEFAULT_ATTACHMENT, type CharmAttachment } from './charm-attachment';
import type { CordStyle } from './cord-design';

interface Flower {
	attachment?: CharmAttachment;
	baseAttachment?: CharmAttachment;
	stemColour?: number[];
	stemWidth?: number;
	stemCalyx?: boolean;
}
interface Pose {
	x: number; y: number; angle: number; width: number; height: number; cordStyle: CordStyle;
}

/** Keep the approved frontal bloom while its curved stalk follows the same body transform. */
export function createFlowerStemBridge(svg: SVGElement, thread: SVGPathElement) {
	const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	group.dataset.part = 'flower-stem-bridge';
	group.style.pointerEvents = 'none';
	group.style.display = 'none';
	const paths = Array.from({ length: 3 }, () => {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('fill', 'none');
		path.setAttribute('stroke-linecap', 'round');
		path.setAttribute('stroke-linejoin', 'round');
		group.append(path);
		return path;
	});
	const calyx = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	group.append(calyx);
	svg.append(group);
	let previousStroke = '', appliedTint = '';
	return {
		render(flower: Flower, pose: Pose) {
			const base = flower.baseAttachment;
			group.style.display = base ? '' : 'none';
			const colour = flower.stemColour;
			if (colour && pose.cordStyle === 'stem') {
				if (thread.style.stroke !== appliedTint) { previousStroke = thread.style.stroke; }
				thread.style.stroke = `rgb(${colour.join(',')})`;
				appliedTint = thread.style.stroke;
			} else if (appliedTint) {
				if (thread.style.stroke === appliedTint) { thread.style.stroke = previousStroke; }
				appliedTint = '';
			}
			const highlight = svg.querySelector<SVGPathElement>('[id$="cord-highlight"]');
			if (highlight) {
				highlight.style.stroke = colour && pose.cordStyle === 'stem'
					? `rgb(${colour.map(value => Math.min(220, value + 55)).join(',')})` : '';
			}
			if (!base) { return; }
			const root = flower.attachment ?? DEFAULT_ATTACHMENT;
			const point = (x: number, y: number) => `${(x - .5) * pose.width} ${(y - .5) * pose.height}`;
			const path = `M ${point(root.x, root.y)} C ${point(.5, .075)} ${point(.02, .04)} ${point(.01, .20)} `
				+ `C ${point(-.035, .32)} ${point(-.02, .78)} ${point(.20, .96)} `
				+ `C ${point(.35, 1.10)} ${point(base.x, base.y + .13)} ${point(base.x, base.y)}`;
			calyx.style.display = flower.stemCalyx ? '' : 'none';
			if (flower.stemCalyx) {
				calyx.setAttribute('d', `M ${point(base.x, base.y + .012)} `
					+ `C ${point(base.x - .01, base.y - .03)} ${point(base.x - .035, base.y - .02)} ${point(base.x - .055, base.y - .04)} `
					+ `Q ${point(base.x - .02, base.y - .065)} ${point(base.x, base.y - .045)} `
					+ `Q ${point(base.x + .02, base.y - .065)} ${point(base.x + .055, base.y - .04)} `
					+ `C ${point(base.x + .035, base.y - .02)} ${point(base.x + .01, base.y - .03)} ${point(base.x, base.y + .012)} Z`);
				calyx.setAttribute('fill', `rgb(${(colour ?? [60, 85, 45]).join(',')})`);
			}
			const width = Math.max(1.5, (flower.stemWidth ?? .02) * pose.width);
			const shades = [-18, 0, 35], widths = [width + .6, width, width * .3];
			paths.forEach((stroke, index) => {
				stroke.setAttribute('d', path);
				stroke.setAttribute('stroke', `rgb(${(colour ?? [60, 85, 45])
					.map(value => Math.max(0, Math.min(235, value + shades[index]))).join(',')})`);
				stroke.setAttribute('stroke-width', String(widths[index]));
			});
			group.setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.angle * 180 / Math.PI})`);
			const x = (base.x - .5) * pose.width, y = (base.y - .5) * pose.height;
			group.dataset.baseX = String(pose.x + x * Math.cos(pose.angle) - y * Math.sin(pose.angle));
			group.dataset.baseY = String(pose.y + x * Math.sin(pose.angle) + y * Math.cos(pose.angle));
		},
	};
}
