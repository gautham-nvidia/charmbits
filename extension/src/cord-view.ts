import { chainLinks, cordPath, stemFoliage, type CordPoint, type CordStyle } from './cord-design';

const SVG = 'http://www.w3.org/2000/svg';
let stemSequence = 0;
const profiles: Record<CordStyle, { base: string; light: string; width: number; dash?: string }> = {
	thread: { base: '#8e6e57', light: '#e7c8a2', width: 1.8 },
	soft: { base: '#285d60', light: '#a7ded2', width: 3.4 },
	braid: { base: '#85272c', light: '#f2b789', width: 4, dash: '2 3' },
	leather: { base: '#503927', light: '#bd8f5d', width: 3.8, dash: '1 7' },
	ribbon: { base: '#9e4a6d', light: '#f5c5d6', width: 5 },
	stem: { base: '#2e673e', light: '#9abf7a', width: 2.7 },
	'silver-chain': { base: '#4e5c66', light: '#e5eef3', width: 1 },
	'gold-chain': { base: '#7d5623', light: '#f5d985', width: 1 },
	'ball-chain': { base: '#52636a', light: '#deeceb', width: .9 },
};

export function createCordView(svg: SVGElement, thread: SVGPathElement) {
	const path = (id: string) => {
		const node = document.createElementNS(SVG, 'path');
		node.id = id;
		node.setAttribute('fill', 'none');
		node.setAttribute('stroke-linecap', 'round');
		node.setAttribute('stroke-linejoin', 'round');
		svg.append(node);
		return node;
	};
	const shadow = path('cord-shadow');
	svg.insertBefore(shadow, thread);
	const highlight = path('cord-highlight');
	const links = path('cord-links');
	const shine = path('cord-shine');
	const leaf = path('cord-leaves'), vein = path('cord-leaf-veins');
	const definitions = document.createElementNS(SVG, 'defs');
	const gradient = document.createElementNS(SVG, 'radialGradient');
	gradient.id = `stem-shade-${++stemSequence}`;
	gradient.setAttribute('cx', '30%'); gradient.setAttribute('cy', '18%'); gradient.setAttribute('r', '85%');
	for (const [offset, color] of [['0%', '#c1d99e'], ['20%', '#87a969'], ['55%', '#527943'], ['100%', '#244b2c']]) {
		const stop = document.createElementNS(SVG, 'stop');
		stop.setAttribute('offset', offset);
		stop.setAttribute('stop-color', color);
		gradient.append(stop);
	}
	definitions.append(gradient);
	svg.prepend(definitions);
	leaf.setAttribute('fill', '#24472d');
	leaf.setAttribute('stroke', '#25482d');
	leaf.setAttribute('stroke-width', '.7');
	vein.setAttribute('stroke', '#bfd59c');
	vein.setAttribute('stroke-width', '.45');
	vein.setAttribute('opacity', '.65');
	const surfaces: { face: SVGPathElement; fold: SVGPathElement }[] = [];
	let pose: { style: CordStyle; anchor: CordPoint; hook: CordPoint; bend: number } | undefined;
	let moving = false, timer: number | undefined, leafFrames = 0;
	let previous = '';
	function stop() {
		if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; }
		svg.dataset.leafMotion = 'still';
	}
	function paintLeaves() {
		const foliage = pose?.style === 'stem'
			? stemFoliage(pose.anchor, pose.hook, pose.bend, moving && !document.hidden ? performance.now() / 1000 : 0) : [];
		for (let index = surfaces.length; index < foliage.length; index++) {
			const face = path(`cord-leaf-face-${index}`), fold = path(`cord-leaf-fold-${index}`);
			face.setAttribute('fill', `url(#${gradient.id})`);
			fold.setAttribute('fill', '#1d4529'); fold.setAttribute('opacity', '.3');
			surfaces.push({ face, fold });
			svg.append(vein);
		}
		for (const [index, surface] of surfaces.entries()) {
			surface.face.setAttribute('d', foliage[index]?.blade ?? '');
			surface.fold.setAttribute('d', foliage[index]?.fold ?? '');
		}
		leaf.setAttribute('d', foliage.map(value => value.blade).join(' '));
		vein.setAttribute('d', foliage.map(value => value.veins).join(' '));
		svg.dataset.leafFrames = String(++leafFrames);
	}
	function schedule() {
		if (!moving || document.hidden || pose?.style !== 'stem') { stop(); return; }
		svg.dataset.leafMotion = 'living';
		if (timer === undefined) {
			timer = window.setTimeout(() => { timer = undefined; paintLeaves(); schedule(); }, 80);
		}
	}
	window.addEventListener('pagehide', stop);
	window.addEventListener('pageshow', schedule);
	document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); } else { schedule(); } });
	return {
		setMotion(allowed: boolean) {
			if (moving === allowed) { return; }
			moving = allowed;
			if (!moving) { stop(); }
			paintLeaves(); schedule();
		},
		render(style: CordStyle, anchor: CordPoint, hook: CordPoint, bend = 0) {
			pose = { style, anchor, hook, bend };
			const curve = cordPath(anchor, hook, bend);
			const key = `${style}:${curve}`;
			if (key === previous) { schedule(); return; }
			previous = key;
			svg.dataset.style = style;
			const profile = profiles[style];
			const metal = style.endsWith('chain');
			for (const node of [shadow, thread, highlight]) { node.setAttribute('d', curve); }
			shadow.setAttribute('stroke', '#101c2460');
			shadow.setAttribute('stroke-width', String(profile.width + 1.2));
			thread.style.stroke = profile.base;
			thread.style.strokeWidth = String(profile.width);
			highlight.setAttribute('stroke', profile.light);
			highlight.setAttribute('stroke-width', String(metal ? .45 : style === 'ribbon' ? 2.6 : profile.width * .38));
			highlight.setAttribute('stroke-dasharray', profile.dash ?? 'none');
			const geometry = metal ? chainLinks(anchor, hook, style === 'ball-chain', bend) : '';
			links.setAttribute('d', geometry);
			links.setAttribute('stroke', profile.base);
			links.setAttribute('stroke-width', '1.8');
			links.setAttribute('fill', style === 'ball-chain' ? profile.light : 'none');
			shine.setAttribute('d', geometry);
			shine.setAttribute('stroke', profile.light);
			shine.setAttribute('stroke-width', '.7');
			paintLeaves(); schedule();
		},
	};
}
