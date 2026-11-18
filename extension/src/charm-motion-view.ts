// Gautham Anebajagane · TM · Operations
import { drawTextureMesh, type TextureMesh } from './live-art-renderer';

type PetKind = 'pet-dog' | 'pet-cat' | 'pet-rabbit';
export type EffectKind = 'gem' | 'metal' | 'leaves' | 'flame' | 'water' | 'curry' | 'mj' | 'sway' | PetKind;
type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Surface = { mesh: TextureMesh; points: Point[]; rect: Rect };
type Eye = { x: number; y: number; rx: number; ry: number };
const petProfiles: Record<PetKind, { eyes: Eye[]; accent: Rect }> = {
	'pet-dog': {
		eyes: [
			{ x:146.19,y:54.56,rx:6,ry:3.8 },
			{ x:169.48,y:52.14,rx:4.5,ry:4 },
		],
		accent: {x:27,y:167,w:54,h:58},
	},
	'pet-cat': {
		eyes: [
			{ x:39.49,y:58.18,rx:5.8,ry:4 },
			{ x:61.09,y:57.13,rx:5.5,ry:4 },
		],
		accent: {x:135,y:182,w:72,h:60},
	},
	'pet-rabbit': {
		eyes: [{x:70.13,y:44.60,rx:7.1,ry:8}],
		accent: {x:81,y:30,w:37,h:80},
	},
};
const isPet = (kind?: EffectKind): kind is PetKind => Boolean(kind && kind in petProfiles);
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t); };
const full = { x: 0, y: 0, w: 216, h: 252 };
function canvas(width = 432, height = 504) {
	const element = document.createElement('canvas'); element.width = width; element.height = height;
	return element;
}
function surface(source: HTMLCanvasElement, rect: Rect = full, columns = 12, rows = 15): Surface {
	const texture = canvas(rect.w * 2, rect.h * 2);
	texture.getContext('2d')!.drawImage(source, rect.x * 2, rect.y * 2, rect.w * 2, rect.h * 2, 0, 0, texture.width, texture.height);
	const uv: number[] = [], indices: number[] = [], points: Point[] = [];
	for (let y = 0; y <= rows; y++) {
		for (let x = 0; x <= columns; x++) {
			uv.push(x / columns, y / rows);
			points.push({ x: rect.x + rect.w * x / columns, y: rect.y + rect.h * y / rows });
			if (x < columns && y < rows) {
				const a = y * (columns + 1) + x, b = a + columns + 1;
				indices.push(a, b, a + 1, b, b + 1, a + 1);
			}
		}
	}
	return { rect, points, mesh: { image: texture, uv: new Float32Array(uv),
		indices: new Uint16Array(indices), positions: new Float32Array(uv.length) } };
}
function deform(ctx: CanvasRenderingContext2D, layer: Surface, warp: (p: Point) => Point) {
	layer.points.forEach((point, index) => {
		const p = warp(point);
		layer.mesh.positions[index * 2] = p.x / 3; layer.mesh.positions[index * 2 + 1] = p.y / 3;
	});
	drawTextureMesh(ctx, layer.mesh);
}

/** Quiet artwork responses shared by the editor, desktop and website. */
export class MaterialMotion {
	readonly canvas = canvas();
	readonly owner: HTMLElement;
	private frame = canvas();
	private source?: HTMLCanvasElement;
	private context = this.frame.getContext('2d')!;
	private texture?: Surface;
	private patches: Surface[] = [];
	private waterMask?: HTMLCanvasElement;
	private waterLight?: HTMLCanvasElement;
	private waterPixels?: Uint8ClampedArray;
	private ballMask?: HTMLCanvasElement;
	private ballLight?: HTMLCanvasElement;
	private closedEyes?: HTMLCanvasElement;
	private petAccent?: Surface;
	private kind?: EffectKind;
	private enabled = false;
	private timer?: number;
	private generation = 0;
	private selection = '';
	private original?: HTMLImageElement;
	private started = performance.now();
	private reaction = 0;
	private frames = 0;
	private pointer = { x: 0, y: 0 };
	private displayWidth = 168;
	private resizeObserver: ResizeObserver;
	constructor(host: HTMLElement) {
		this.owner = host;
		this.original = host.querySelector('img') ?? undefined;
		this.canvas.className = 'material-canvas'; this.canvas.setAttribute('aria-hidden', 'true');
		Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
		this.canvas.hidden = true; host.append(this.canvas);
		this.resizeObserver = new ResizeObserver(entries => {
			this.displayWidth = Math.max(84, Math.round(entries[0].contentRect.width * 2));
			this.paint();
		});
		this.resizeObserver.observe(host);
		host.addEventListener('pointermove', event => {
			const rect = host.getBoundingClientRect();
			this.pointer = { x: clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
				y: clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1) };
		});
		host.addEventListener('pointerleave', () => { this.pointer = { x: 0, y: 0 }; });
	}
	get configured() { return this.kind !== undefined; }
	async select(url: string, kind?: EffectKind, options: { hook?: Point; blink?: string } = {}) {
		const selection = JSON.stringify([url, kind, options.hook, options.blink]);
		if (selection === this.selection) { return; }
		this.selection = selection;
		const generation = ++this.generation;
		this.stop(); this.kind = kind; this.source = undefined; this.canvas.hidden = true;
		this.owner.dataset.materialRendered = 'false';
		delete this.owner.dataset.materialError;
		if (this.original) { this.original.style.opacity = ''; }
		const {hook} = options;
		this.canvas.style.transformOrigin=hook?`${hook.x*100}% ${hook.y*100}%`:'50% 50%';
		if (!kind) { return; }
		const image = new Image();
		if (/^https?:/i.test(url)) { image.crossOrigin = 'anonymous'; }
		image.src = url;
		const pose = isPet(kind) && options.blink ? new Image() : undefined;
		if (pose) {
			if (/^https?:/i.test(options.blink!)) { pose.crossOrigin = 'anonymous'; }
			pose.src = options.blink!;
		}
		try {
			await Promise.all([image.decode(),pose?.decode()]);
			if (generation !== this.generation) { return; }
			this.prepare(image, kind, pose);
		} catch (error) {
			if (generation !== this.generation) { return; }
			this.source = undefined; this.kind = undefined;
			this.owner.dataset.materialError = 'true';
			throw error;
		}
		if (generation !== this.generation) { return; }
		this.displayWidth = Math.max(84, Math.round(parseFloat(getComputedStyle(this.owner).width) * 2) || 84);
		this.started = performance.now(); this.reaction = 0; this.canvas.hidden = false;
		if (this.original) {
			this.canvas.style.filter = getComputedStyle(this.original).filter;
			this.original.style.opacity = '0';
		}
		this.owner.dataset.materialRendered = 'true'; this.paint();
	}
	private prepare(image: HTMLImageElement, kind: EffectKind, pose?: HTMLImageElement) {
		this.source = canvas();
		// Match the original img's object-fit: contain, including non-square imported packs.
		const fit = Math.min(432 / image.naturalWidth, 504 / image.naturalHeight);
		const width = image.naturalWidth * fit, height = image.naturalHeight * fit;
		this.source.getContext('2d')!.drawImage(image, (432 - width) / 2, (504 - height) / 2, width, height);
		this.patches = []; this.petAccent = undefined; this.closedEyes = undefined;
		this.waterMask = undefined; this.waterLight = undefined; this.waterPixels = undefined;
		this.ballMask = undefined; this.ballLight = undefined;
		this.texture = surface(this.source, full, kind === 'mj' ? 20 : 13, kind === 'mj' ? 29 : 16);
		if (kind === 'flame') {
			this.patches = [surface(this.source, { x: 7, y: 8, w: 45, h: 78 }, 7, 12),
				surface(this.source, { x: 155, y: 7, w: 32, h: 49 }, 6, 10)];
		}
		if (kind === 'water') { this.prepareWater(); }
		if (kind === 'curry') { this.prepareCurry(); }
		if (isPet(kind)) { this.preparePet(kind,pose); }
	}
	setActive(enabled: boolean) {
		if (this.enabled === enabled) { return; }
		this.enabled = enabled;
		if (!enabled) { this.reaction = 0; }
		else { this.started = performance.now(); }
		this.paint();
	}
	play() {
		if (!this.enabled) { return; }
		if (isPet(this.kind) && this.reaction && performance.now() - this.reaction < 1800) { return; }
		this.started = performance.now(); this.reaction = performance.now(); this.paint();
	}
	hold() {
		// A repeated pat must not erase a pet's ongoing blink.
		if (!isPet(this.kind)) { this.cancelReaction(); }
	}
	cancelReaction() {
		if (!this.reaction) { return; }
		this.reaction = 0;
		this.paint();
	}
	dispose() {
		this.generation++; this.enabled = false; this.stop();
		this.resizeObserver.disconnect(); this.canvas.remove();
		if (this.original) { this.original.style.opacity = ''; }
		this.owner.dataset.materialRendered = 'false';
		this.source = undefined; this.texture = undefined; this.closedEyes = undefined;
		this.patches = []; this.petAccent = undefined;
	}
	private stop() {
		if (this.timer !== undefined) { clearTimeout(this.timer); }
		this.timer = undefined; this.canvas.dataset.motion = 'still';
	}
	private prepareWater() {
		const data = this.source!.getContext('2d')!.getImageData(0, 0, 432, 504);
		for (let y = 0; y < 504; y++) {
			for (let x = 0; x < 432; x++) {
				const o = (y * 432 + x) * 4, [r, g, b] = data.data.subarray(o, o + 3);
				const lake = x > 90 && x < 360 && y > 55 && y < 220 && b > r * 1.25 && b > g * 1.05;
				data.data[o] = data.data[o + 1] = data.data[o + 2] = 255;
				data.data[o + 3] = lake ? data.data[o + 3] : 0;
			}
		}
		this.waterMask = canvas(); this.waterMask.getContext('2d')!.putImageData(data, 0, 0);
		this.waterLight = canvas();
		this.waterPixels = data.data;
		this.patches = [surface(this.source!, { x: 44, y: 26, w: 140, h: 86 }, 18, 12)];
	}
	private prepareCurry() {
		const data = this.source!.getContext('2d')!.getImageData(0, 0, 432, 504);
		for (let y = 0; y < 504; y++) {
			for (let x = 0; x < 432; x++) {
				const offset = (y * 432 + x) * 4;
				const [r, g, b] = data.data.subarray(offset, offset + 3);
				const ball = Math.hypot(x / 2 - 108.5, y / 2 - 73) < 18.5 && r > g * 1.6 && g > b * 1.35;
				data.data[offset] = data.data[offset + 1] = data.data[offset + 2] = 255;
				if (!ball) { data.data[offset + 3] = 0; }
			}
		}
		this.ballMask = canvas(); this.ballMask.getContext('2d')!.putImageData(data, 0, 0);
		this.ballLight = canvas();
	}
	private preparePet(kind: PetKind, pose?: HTMLImageElement) {
		const profile = petProfiles[kind];
		this.petAccent = surface(this.source!,profile.accent,12,16);
		this.closedEyes = undefined;
		if (!pose) { return; }
		const overlay = canvas(), ctx = overlay.getContext('2d')!;
		ctx.drawImage(pose,0,0,432,504);
		const pixels = ctx.getImageData(0,0,432,504);
		for (let y=0;y<504;y++) {
			for (let x=0;x<432;x++) {
				let opacity = 0;
				for (const eye of profile.eyes) {
					const radius = Math.hypot((x/2-eye.x)/(eye.rx+3.5),(y/2-eye.y)/(eye.ry+3.5));
					opacity = Math.max(opacity,smooth((1-radius)/.3));
				}
				const offset = (y*432+x)*4;
				if (opacity>.2 && pixels.data[offset+1]>190
					&& pixels.data[offset+1]-Math.max(pixels.data[offset],pixels.data[offset+2])>150) {
					throw new Error('The eyelid frame does not align with the original pet.');
				}
				pixels.data[offset+3] *= opacity;
			}
		}
		ctx.putImageData(pixels,0,0); this.closedEyes = overlay;
	}
	private pet(progress: number) {
		const blink = smooth((progress-.07)/.11) * (1-smooth((progress-.29)/.17));
		if (this.closedEyes) {
			this.context.save(); this.context.globalAlpha = blink;
			this.context.drawImage(this.closedEyes,0,0); this.context.restore();
		}
		const layer = this.petAccent!, {rect} = layer;
		const gesture = Math.sin(progress*Math.PI)**2 * Math.sin(progress*Math.PI*3) * .7;
		this.context.clearRect(rect.x*2,rect.y*2,rect.w*2,rect.h*2);
		deform(this.context,layer,p=>{
			const edge = smooth((p.x-rect.x)/5)*smooth((rect.x+rect.w-p.x)/5)
				* smooth((p.y-rect.y)/5)*smooth((rect.y+rect.h-p.y)/5);
			if (this.kind==='pet-rabbit') { return {x:p.x+gesture*edge*smooth((p.y-60)/30),y:p.y}; }
			const root = this.kind==='pet-dog' ? smooth((75-p.x)/17) : smooth((p.x-155)/30);
			return {x:p.x,y:p.y+gesture*edge*root};
		});
	}
	private sway(progress: number) {
		const amount = Math.sin(progress*Math.PI)**2 * Math.sin(progress*Math.PI*2);
		this.canvas.style.transform = `perspective(500px) rotateY(${amount*3}deg) rotate(${amount}deg)`;
	}
	private light(seconds: number, kind: 'gem' | 'metal') {
		const ctx = this.context, cycle = seconds % 12;
		const sweep = kind === 'gem' ? cycle / 3 : .5 + this.pointer.x * .3 + Math.sin(seconds * .6) * .12;
		if (kind === 'gem' && cycle > 3) { return; }
		ctx.save(); ctx.globalCompositeOperation = 'source-atop';
		const x = (sweep * 1.7 - .4) * 432;
		const sheen = ctx.createLinearGradient(x - 100, 0, x + 70, 150);
		sheen.addColorStop(0, '#f4fffa00'); sheen.addColorStop(.46, '#f4fffa00');
		sheen.addColorStop(.55, kind === 'gem' ? '#d8ffea50' : '#efffff44');
		sheen.addColorStop(.67, '#f4fffa08'); sheen.addColorStop(1, '#f4fffa00');
		ctx.fillStyle = sheen; ctx.fillRect(0, 0, 432, 504);
		if (kind === 'gem') {
			const glow = Math.sin(clamp(cycle / 3) * Math.PI) ** 7;
			ctx.globalAlpha = glow; ctx.translate(319, 94);
			ctx.strokeStyle = '#edfff4'; ctx.lineWidth = 1.5;
			ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
		}
		ctx.restore();
	}
	private leaves(seconds: number) {
		const lobes = [[50,82,29,27],[109,53,36,28],[163,79,32,24],[162,121,28,23],[37,140,23,22]];
		this.context.clearRect(0, 0, 432, 504);
		deform(this.context, this.texture!, p => {
			let weight = 0;
			for (const [x,y,rx,ry] of lobes) { weight = Math.max(weight, Math.exp(-(((p.x-x)/rx)**2 + ((p.y-y)/ry)**2) * 2)); }
			weight *= smooth((p.y - 33) / 15) * smooth((172 - p.y) / 16);
			return { x: p.x + Math.sin(seconds * 1.05 + p.y * .04) * weight * 1.45,
				y: p.y + Math.cos(seconds * .75 + p.x * .055) * weight * .55 };
		});
	}
	private flame(seconds: number) {
		for (const [index, patch] of this.patches.entries()) {
			const { rect } = patch, base = index ? { x: 170, y: 50 } : { x: 28, y: 82 };
			this.context.clearRect(rect.x * 2, rect.y * 2, rect.w * 2, rect.h * 2);
			deform(this.context, patch, p => {
				const height = clamp((base.y - p.y) / (base.y - rect.y));
				const side = Math.exp(-(((p.x - base.x) / (index ? 8 : 13)) ** 4));
				const edge = smooth((p.x - rect.x) / 4) * smooth((rect.x + rect.w - p.x) / 4);
				const weight = height * side * edge;
				return { x: p.x + (Math.sin(seconds * 4 + index) * 1.6 + Math.sin(seconds * 7.3) * .45) * weight,
					y: p.y - Math.sin(seconds * 3.5 + index) * weight * 1.5 };
			});
		}
		this.context.save(); this.context.globalCompositeOperation = 'source-atop';
		for (const [x,y,r] of [[55,105,55],[341,57,31]]) {
			const glow = this.context.createRadialGradient(x, y, 2, x, y, r);
			glow.addColorStop(0, `rgba(255,232,123,${.05 + Math.sin(seconds * 4) * .025})`);
			glow.addColorStop(1, 'rgba(255,200,50,0)');
			this.context.fillStyle = glow; this.context.fillRect(x-r, y-r, r*2, r*2);
		}
		this.context.restore();
	}
	private water(seconds: number) {
		const patch = this.patches[0], { rect } = patch, pixels = this.waterPixels!;
		this.context.clearRect(rect.x*2, rect.y*2, rect.w*2, rect.h*2);
		deform(this.context, patch, p => {
			const offset = (Math.min(503, Math.round(p.y*2)) * 432 + Math.min(431, Math.round(p.x*2))) * 4;
			const weight = pixels[offset + 3] / 255;
			return { x: p.x + Math.sin(seconds * .8 + p.y * .3) * .35 * weight,
				y: p.y + Math.sin(seconds + p.x * .18) * .18 * weight };
		});
		const shimmer = this.waterLight!, ctx = shimmer.getContext('2d')!;
		ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,432,504);ctx.globalCompositeOperation='source-over';
		ctx.scale(2, 2); ctx.lineCap = 'round';
		for (let n = 0; n < 11; n++) {
			const x = 58 + n * 10 + Math.sin(seconds * .55 + n) * 4;
			const y = 42 + (n * 13 % 57) + Math.sin(seconds * .7 + n) * 1.2;
			ctx.strokeStyle = `rgba(164,226,237,${.08 + .045 * Math.sin(seconds + n)})`;
			ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(x, y, 7 + n % 4, .65, 0, 0, Math.PI * 2); ctx.stroke();
		}
		ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(this.waterMask!, 0, 0);
		this.context.drawImage(shimmer, 0, 0);
	}
	private mj(progress: number) {
		const amount = Math.sin(progress * Math.PI) ** 1.2;
		this.context.clearRect(0,0,432,504);
		deform(this.context, this.texture!, p => {
			const head = Math.exp(-(((p.x - 95) / 31) ** 4 + ((p.y - 31) / 24) ** 4));
			const angle = amount * -.09, dx = p.x - 96, dy = p.y - 56;
			const hx = 96 + dx*Math.cos(angle) - dy*Math.sin(angle), hy = 56 + dx*Math.sin(angle) + dy*Math.cos(angle);
			const toe = smooth((p.y - 205) / 27);
			return { x: lerp(p.x, hx, head) + toe * amount * (p.x < 107 ? -1.4 : 1.4),
				y: lerp(p.y, hy, head) + head * amount * 1.7 - toe * amount * (p.x > 111 ? 1.1 : 0) };
		});
	}
	private curry(progress: number) {
		// Keep the photograph intact: a portrait cannot supply missing shooting poses.
		const envelope = Math.sin(progress * Math.PI);
		this.canvas.style.transformOrigin = '50% 6%';
		this.canvas.style.transform = `rotate(${Math.sin(progress * Math.PI * 2) * envelope * 1.3}deg)`;
		const light = this.ballLight!, ctx = light.getContext('2d')!;
		ctx.clearRect(0, 0, 432, 504); ctx.globalCompositeOperation = 'source-over';
		const glow = ctx.createRadialGradient(195 + progress * 40, 133, 0, 215, 145, 36);
		glow.addColorStop(0, `rgba(255,226,182,${envelope * envelope * .14})`);
		glow.addColorStop(1, 'rgba(255,226,182,0)');
		ctx.fillStyle = glow; ctx.fillRect(175, 104, 84, 84);
		ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(this.ballMask!, 0, 0);
		this.context.drawImage(light, 0, 0);
	}
	private paint = () => {
		this.stop();
		if (!this.source || !this.kind) { return; }
		const ctx = this.context, now = performance.now(), elapsed = this.reaction ? (now - this.reaction) / 1000 : Infinity;
		const pet = isPet(this.kind);
		const tapOnly = this.kind === 'curry' || this.kind === 'mj' || this.kind === 'sway' || pet;
		const duration = pet ? 1.8 : this.kind === 'curry' || this.kind === 'sway' ? 1.45 : 1.65;
		const active = this.enabled && !document.hidden && (!tapOnly || elapsed < duration);
		this.owner.dataset.tapMotion = this.enabled && !document.hidden && elapsed < duration ? 'playing' : 'idle';
		ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,432,504); ctx.drawImage(this.source,0,0);
		this.canvas.style.transform = '';
		if (active) {
			const seconds = (now - this.started) / 1000;
			if (this.kind === 'gem' || this.kind === 'metal') { this.light(seconds, this.kind); }
			if (this.kind === 'metal') { this.canvas.style.transform = `perspective(500px) rotateY(${this.pointer.x*7}deg) rotateX(${-this.pointer.y*5}deg)`; }
			if (this.kind === 'leaves') { this.leaves(seconds); }
			if (this.kind === 'flame') { this.flame(seconds); }
			if (this.kind === 'water') { this.water(seconds); }
			if (this.kind === 'mj') { this.mj(elapsed / duration); }
			if (this.kind === 'curry') { this.curry(elapsed / duration); }
			if (pet) { this.pet(elapsed / duration); }
			if (this.kind === 'sway') { this.sway(elapsed / duration); }
			this.timer = window.setTimeout(this.paint, tapOnly ? 40 : 80);
		}
		const displayWidth = this.displayWidth;
		const displayHeight=Math.round(displayWidth*7/6);
		if(this.canvas.width!==displayWidth||this.canvas.height!==displayHeight){this.canvas.width=displayWidth;this.canvas.height=displayHeight;}
		const screen=this.canvas.getContext('2d')!;
		screen.clearRect(0,0,displayWidth,displayHeight);screen.imageSmoothingEnabled=true;screen.imageSmoothingQuality='high';
		screen.drawImage(this.frame,0,0,displayWidth,displayHeight);
		this.canvas.dataset.frames = String(++this.frames);
		this.canvas.dataset.motion = active ? 'living' : 'still';
		this.canvas.dataset.progress = Number.isFinite(elapsed) ? clamp(elapsed/duration).toFixed(3) : '0';
	};
}
// Gautham Anebajagane · TM · Operations
