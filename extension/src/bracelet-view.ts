import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';
import { isSoftCharm, type CharmDefinition } from './charm-catalog';
import { DEFAULT_ATTACHMENT } from './charm-attachment';
import { clamp, type CharmState } from './charm-state';
import { createCordView } from './cord-view';
import { cordForCharm } from './cord-design';
import { createBloomView } from './bloom-view';
import { createFlowerStemBridge } from './flower-stem-view';
import { createLiveSmiley } from './live-smiley';
import { createFidgetView } from './fidget-view';
import { MaterialMotion } from './charm-motion-view';
import { blinkFile, motionKind, petMotionProfile } from './charm-motion';
import type { BraceletStyle } from './bracelet-core';

interface Options {
	image(charm: CharmDefinition): string;
	asset(file: string): string;
	state(): CharmState;
	select(index: number): void;
	puzzleTap(): void;
}
interface Slot {
	button: HTMLButtonElement; image: HTMLImageElement; svg: SVGSVGElement;
	cord: ReturnType<typeof createCordView>; stem: ReturnType<typeof createFlowerStemBridge>;
	bloom: ReturnType<typeof createBloomView>; live: ReturnType<typeof createLiveSmiley>;
	fidget: ReturnType<typeof createFidgetView>; material: MaterialMotion;
	item: CharmDefinition; body?: Body; tether?: Constraint;
	anchor: { x: number; y: number }; size: number;
}
const SVG = 'http://www.w3.org/2000/svg';
function svgElement<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string> = {}) {
	const element = document.createElementNS(SVG, tag);
	for (const [name, value] of Object.entries(attributes)) { element.setAttribute(name, value); }
	return element;
}
let instance = 0;
const BAND_COLOURS: Record<BraceletStyle, { base: string; light: string }> = {
	silver: { base: '#53646a', light: '#e6eeee' },
	gold: { base: '#916b35', light: '#f5dda1' },
	'rose-gold': { base: '#996b62', light: '#f6cfc0' },
	woven: { base: '#8b795e', light: '#e8dcc2' },
	pearl: { base: '#aa987d', light: '#fff9ee' },
};

/** A bounded, optional bracelet; each pendant retains its own physics and reaction controller. */
export class BraceletView {
	private readonly engine = Engine.create({ enableSleeping: true });
	private readonly slots: Slot[] = [];
	private readonly main = svgElement('svg', { class: 'bracelet-wire', 'aria-hidden': 'true' });
	private readonly band = svgElement('g', { 'data-part': 'bracelet-band' });
	private bandWidth = 0;
	private bandKey = '';
	private readonly prefix = `bracelet-${++instance}`;
	private items: readonly CharmDefinition[] = [];
	private active = false;
	private reduced = false;
	private frame?: number;
	private lastTime = 0;
	private accumulated = 0;
	private quietFrames = 0;
	private frames = 0;
	private geometry = '';
	private layoutPending = true;
	private grip?: Constraint;
	private held?: { slot: Slot; id: number; x: number; y: number; moved: number };
	constructor(readonly stage: HTMLElement, private readonly options: Options) {
		stage.append(this.main);
		this.engine.gravity.y = .8;
		window.addEventListener('blur', () => { this.releaseHold(); this.settle(); });
	}
	setGeometry(area: { width: number; height: number; anchorX: number; anchorY: number }) {
		const width = Math.min(380, area.width), height = Math.min(310, area.height - area.anchorY);
		const left = clamp(area.anchorX - width / 2, 0, area.width - width);
		const next = `${width}:${height}:${left}:${area.anchorY}`;
		if (next === this.geometry && !this.layoutPending) { return; }
		this.geometry = next;
		Object.assign(this.stage.style, { width: `${width}px`, height: `${height}px`, left: `${left}px`, top: `${area.anchorY}px` });
		this.layout();
	}
	setItems(items: readonly CharmDefinition[]) {
		const same = items.length === this.items.length && items.every((item, index) => {
			const old = this.items[index];
			return item.id === old.id && item.file === old.file && item.source === old.source && item.artworkHash === old.artworkHash;
		});
		if (same) { this.sync(); this.render(); return; }
		this.releaseHold();
		this.items = items.slice(0, 3);
		while (this.slots.length < this.items.length) { this.createSlot(); }
		this.slots.forEach((slot, index) => {
			const item = this.items[index];
			slot.button.hidden = !item; slot.svg.style.display = item ? '' : 'none';
			if (!item) { return; }
			slot.item = item;
			slot.button.setAttribute('aria-label', `Tap or pull ${item.name}, charm ${index + 1}`);
			slot.button.dataset.charm = item.id;
			slot.button.dataset.soft = String(isSoftCharm(item.id));
			const source = this.options.image(item), pose = blinkFile(item);
			if (slot.image.src !== source) { slot.image.src = source; }
			void slot.material.select(source, motionKind(item), {
				hook: item.attachment, blink: pose ? this.options.asset(pose) : undefined, pet: petMotionProfile(item),
			}).catch(error => console.warn('Bracelet motion could not load; original artwork remains visible.', error));
		});
		this.layout(); this.sync();
	}
	setActive(active: boolean, reduced: boolean) {
		if (this.active === active && this.reduced === reduced) { this.sync(); return; }
		this.active = active; this.reduced = reduced;
		if (!active || reduced) { this.releaseHold(); this.stop(); this.settle(); }
		this.sync();
	}
	setWeather(...args: Parameters<ReturnType<typeof createLiveSmiley>['setWeather']>) {
		for (const slot of this.slots) { slot.live.setWeather(...args); }
	}
	celebrate() { this.slots[this.options.state().bracelet.selected]?.live.celebrate(); }
	focus() { this.slots[this.options.state().bracelet.selected]?.button.focus({ preventScroll: true }); }
	reset() { this.releaseHold(); this.stop(); this.settle(); }
	nudge() {
		const slot = this.slots[this.options.state().bracelet.selected];
		if (slot) { this.react(slot); }
	}
	private createSlot() {
		const index = this.slots.length, button = document.createElement('button'), image = new Image();
		button.type = 'button'; button.className = 'bracelet-charm';
		button.dataset.slot = String(index);
		image.alt = ''; image.draggable = false; button.append(image);
		const svg = svgElement('svg', { class: 'bracelet-drop', 'aria-hidden': 'true' });
		const thread = svgElement('path', { fill: 'none' }); svg.append(thread);
		this.stage.append(svg, button);
		const cord = createCordView(svg, thread);
		const slot: Slot = {
			button, image, svg, cord, stem: createFlowerStemBridge(svg, thread), item: this.items[index],
			bloom: createBloomView(button, image), live: createLiveSmiley(button, image, this.options.asset),
			fidget: createFidgetView(button, image, { tap: () => this.react(slot), rotate: held => {
				if (held) { this.releaseHold(); } else { this.start(); }
			} }),
			material: new MaterialMotion(button), anchor: { x: 0, y: 0 }, size: 70,
		};
		const namespace = () => {
			for (const root of [button, svg]) {
				for (const node of root.querySelectorAll<HTMLElement>('[id]')) {
					if (!/^(live-|cord-)/.test(node.id)) { continue; }
					const old = node.id; node.id = `${this.prefix}-${index}-${old}`;
					for (const child of [root, ...root.querySelectorAll('*')]) {
						for (const name of ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'href', 'aria-labelledby', 'aria-describedby']) {
							const value = child.getAttribute(name);
							if (value?.includes(old)) { child.setAttribute(name, value.replaceAll(old, node.id)); }
						}
					}
				}
			}
		};
		new MutationObserver(namespace).observe(button, { childList: true, subtree: true });
		new MutationObserver(namespace).observe(svg, { childList: true, subtree: true });
		namespace();
		button.addEventListener('pointerdown', event => this.grab(slot, event));
		button.addEventListener('pointermove', event => this.move(slot, event));
		for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
			button.addEventListener(type, event => this.release(slot, event));
		}
		button.addEventListener('keydown', event => {
			if (event.defaultPrevented || event.repeat) { return; }
			if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
				event.preventDefault();
				if (event.key.startsWith('Arrow')) {
					this.options.select(index); this.push(slot, event.key === 'ArrowLeft' ? -1 : 1);
				} else { slot.button.dataset.keyboardHeld = 'true'; slot.material.hold(); }
			}
		});
		button.addEventListener('keyup', event => {
			if ((event.key === ' ' || event.key === 'Enter') && button.dataset.keyboardHeld === 'true') {
				event.preventDefault(); button.dataset.keyboardHeld = 'false'; this.react(slot);
			}
		});
		button.addEventListener('blur', () => { button.dataset.keyboardHeld = 'false'; });
		this.slots.push(slot);
	}
	private point(slot: Slot, event: PointerEvent) {
		const rect = this.stage.getBoundingClientRect(), scale = rect.width / this.stage.clientWidth || 1;
		const radius = Math.hypot(slot.size, slot.size * 7 / 6) / 2 + 4;
		return { x: clamp((event.clientX - rect.left) / scale, radius, this.stage.clientWidth - radius),
			y: clamp((event.clientY - rect.top) / scale, radius, this.stage.clientHeight - radius) };
	}
	private grab(slot: Slot, event: PointerEvent) {
		if (!slot.body || !this.active || event.defaultPrevented || event.button !== 0 || this.held) { return; }
		event.preventDefault(); slot.button.setPointerCapture(event.pointerId); slot.material.hold();
		const point = this.point(slot, event), body = slot.body;
		this.held = { slot, id: event.pointerId, ...point, moved: 0 };
		slot.button.classList.add('dragging');
		this.stage.dataset.dragging = 'true';
		if (!this.reduced) {
			this.grip = Constraint.create({ pointA: point, bodyB: body,
				pointB: { x: point.x - body.position.x, y: point.y - body.position.y },
				length: 0, stiffness: .25, damping: .14 });
			Composite.add(this.engine.world, this.grip); Sleeping.set(body, false); this.start();
		}
	}
	private move(slot: Slot, event: PointerEvent) {
		if (this.held?.slot !== slot || this.held.id !== event.pointerId) { return; }
		const point = this.point(slot, event);
		this.held.moved = Math.max(this.held.moved, Math.hypot(point.x - this.held.x, point.y - this.held.y));
		if (this.held.moved > 5) { slot.material.cancelReaction(); }
		if (this.reduced) { Body.setPosition(slot.body!, point); this.render(); }
		else if (this.grip) { this.grip.pointA = point; this.start(); }
	}
	private release(slot: Slot, event: PointerEvent) {
		if (this.held?.slot !== slot || this.held.id !== event.pointerId) { return; }
		const tap = this.held.moved < 5 && event.type === 'pointerup';
		this.releaseHold();
		if (tap) { this.options.select(this.slots.indexOf(slot)); }
		if (this.reduced) { this.settle(); }
		else { if (tap) { this.react(slot); } this.start(); }
	}
	private releaseHold() {
		const held = this.held; this.held = undefined; this.stage.dataset.dragging = 'false';
		if (held) {
			held.slot.button.classList.remove('dragging');
			if (held.slot.button.hasPointerCapture(held.id)) { held.slot.button.releasePointerCapture(held.id); }
		}
		if (this.grip) { Composite.remove(this.engine.world, this.grip); this.grip = undefined; }
	}
	private react(slot: Slot) {
		if (!this.active || !slot.body) { return; }
		this.options.select(this.slots.indexOf(slot));
		this.options.puzzleTap();
		if (!this.active || this.reduced) { return; }
		slot.live.playful(); slot.bloom.play(); slot.material.play();
		this.push(slot, 1);
	}
	private push(slot: Slot, direction: number) {
		if (!this.active || this.reduced || !slot.body) { return; }
		Body.applyForce(slot.body, slot.body.position, { x: direction * .0007, y: -.0006 });
		Sleeping.set(slot.body, false); this.start();
	}
	private paintBand() {
		const width = this.bandWidth, style = this.options.state().bracelet.style;
		const key = `${width}:${style}`;
		if (!width || key === this.bandKey) { return; }
		this.bandKey = key; this.band.replaceChildren(); this.stage.dataset.style = style;
		const { base, light } = BAND_COLOURS[style];
		const curve = `M 14 12 Q ${width / 2} 77 ${width - 14} 12`;
		this.band.append(svgElement('path', { d: curve, fill: 'none', stroke: base,
			'stroke-width': style === 'woven' ? '5' : '1', 'stroke-linecap': 'round' }));
		if (style === 'woven') {
			this.band.append(svgElement('path', { d: curve, fill: 'none', stroke: light,
				'stroke-width': '2.5', 'stroke-dasharray': '2 3', 'stroke-linecap': 'round' }));
		} else {
			const gradient = svgElement('radialGradient', { id: `${this.prefix}-pearl-shade`, cx: '28%', cy: '22%', r: '75%' });
			for (const [offset, colour] of [['0%', '#fffefa'], ['40%', '#f4ede0'], ['78%', '#d4c6af'], ['100%', '#aa987d']]) {
				gradient.append(svgElement('stop', { offset, 'stop-color': colour }));
			}
			const defs = svgElement('defs'); defs.append(gradient); this.band.append(defs);
			const steps = Math.max(2, Math.floor((width - 28) / 7));
			for (let index = 0; index <= steps; index++) {
				const t = index / steps, x = 14 + (width - 28) * t, y = 12 + 130 * t * (1 - t);
				const angle = Math.atan2(130 * (1 - 2 * t), width - 28) * 180 / Math.PI;
				if (style === 'pearl') {
					this.band.append(svgElement('circle', { cx: String(x), cy: String(y), r: '3.5',
						fill: `url(#${gradient.id})`, stroke: '#aa987d', 'stroke-width': '.35' }));
				} else {
					for (const [stroke, strokeWidth, lift] of [[base, '2.4', 0], [light, '.8', -.5]] as const) {
						this.band.append(svgElement('ellipse', { cx: String(x), cy: String(y + lift),
							rx: index % 2 ? '3.1' : '4.8', ry: index % 2 ? '2.3' : '2.8',
							transform: `rotate(${angle} ${x} ${y})`, fill: 'none', stroke, 'stroke-width': strokeWidth }));
					}
				}
			}
		}
		for (const hanger of this.main.querySelectorAll('[data-hanger]')) { hanger.setAttribute('stroke', base); }
	}
	private layout() {
		// Restore can arrive while the stage is hidden. Retry its layout once it
		// becomes visible even if the host reports the same viewport dimensions.
		if (!this.stage.clientWidth) { this.layoutPending = true; return; }
		this.layoutPending = false;
		this.releaseHold(); this.stop(); Composite.clear(this.engine.world, false);
		const width = this.stage.clientWidth, height = this.stage.clientHeight;
		this.main.replaceChildren(this.band); this.main.setAttribute('viewBox', `0 0 ${width} ${height}`);
		this.bandWidth = width; this.paintBand();
		this.slots.forEach((slot, index) => {
			if (index >= this.items.length) { slot.body = undefined; return; }
			slot.size = Math.min(84, (width - 44) / (this.items.length + .65), (height - 90) * .62);
			slot.size = Math.max(24, slot.size);
			const radius = Math.hypot(slot.size, slot.size * 7 / 6) / 2 + 4;
			const margin = Math.min(width / 2, radius + Math.min(24, width * .08));
			const x = margin + index * (width - margin * 2) / Math.max(1, this.items.length - 1);
			const t = (x - 14) / (width - 28);
			slot.anchor = { x, y: 12 + 130 * t * (1 - t) };
			const hook = slot.item.attachment ?? DEFAULT_ATTACHMENT, h = slot.size * 7 / 6;
			const local = { x: (hook.x - .5) * slot.size, y: (hook.y - .5) * h };
			const drop = Math.min(index === 1 && this.items.length === 3 ? 63 : 40, Math.max(16, height - slot.anchor.y - h - 10));
			slot.body = Bodies.circle(slot.anchor.x - local.x, slot.anchor.y + drop - local.y, slot.size * .36,
				{ frictionAir: .055, restitution: .15, sleepThreshold: 45 });
			slot.tether = Constraint.create({ pointA: { ...slot.anchor }, bodyB: slot.body,
				pointB: local, length: drop, stiffness: .9, damping: .12 });
			Composite.add(this.engine.world, [slot.body, slot.tether]); Sleeping.set(slot.body, true);
			slot.button.style.width = `${slot.size}px`; slot.button.style.height = `${h}px`;
			slot.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
			this.main.append(svgElement('ellipse', { cx: String(x), cy: String(slot.anchor.y), rx: '4', ry: '5.5',
				'data-hanger': String(index), fill: 'var(--vscode-editor-background, #f8f7f1)',
				stroke: BAND_COLOURS[this.options.state().bracelet.style].base, 'stroke-width': '1.25' }));
		});
		this.render(); this.sync();
	}
	private settle() {
		for (const slot of this.slots) {
			if (!slot.body || !slot.tether) { continue; }
			const hook = slot.item.attachment ?? DEFAULT_ATTACHMENT, h = slot.size * 7 / 6;
			Body.setAngle(slot.body, 0); Body.setVelocity(slot.body, { x: 0, y: 0 }); Body.setAngularVelocity(slot.body, 0);
			slot.tether.pointB = { x: (hook.x - .5) * slot.size, y: (hook.y - .5) * h };
			// Matter stores the previous body angle internally when rotating the tether point.
			(slot.tether as Constraint & { angleB: number }).angleB = 0;
			Body.setPosition(slot.body, { x: slot.anchor.x - slot.tether.pointB.x, y: slot.anchor.y + slot.tether.length - slot.tether.pointB.y });
			Sleeping.set(slot.body, true);
		}
		this.render();
	}
	private contain(slot: Slot) {
		if (!slot.body) { return; }
		const radius = Math.hypot(slot.size, slot.size * 7 / 6) / 2 + 4, old = slot.body.position;
		const next = { x: clamp(old.x, radius, this.stage.clientWidth - radius),
			y: clamp(old.y, radius, this.stage.clientHeight - radius) };
		if (next.x === old.x && next.y === old.y) { return; }
		Body.setVelocity(slot.body, { x: slot.body.velocity.x * (next.x === old.x ? 1 : -.3),
			y: slot.body.velocity.y * (next.y === old.y ? 1 : -.3) });
		Body.setPosition(slot.body, next);
	}
	private render() {
		const state = this.options.state();
		this.paintBand();
		this.slots.forEach((slot, index) => {
			if (!slot.body || !slot.tether) { return; }
			const { position, angle } = slot.body, width = slot.size, height = width * 7 / 6;
			const attachment = slot.item.attachment ?? DEFAULT_ATTACHMENT;
			const x = (attachment.x - .5) * width, y = (attachment.y - .5) * height;
			const hook = { x: position.x + x * Math.cos(angle) - y * Math.sin(angle),
				y: position.y + x * Math.sin(angle) + y * Math.cos(angle) };
			slot.button.style.transform = `translate(${position.x - width / 2}px,${position.y - height / 2}px) rotate(${angle}rad)`;
			slot.button.dataset.x = position.x.toFixed(2); slot.button.dataset.y = position.y.toFixed(2);
			slot.button.dataset.hookX = hook.x.toFixed(3); slot.button.dataset.hookY = hook.y.toFixed(3);
			slot.button.dataset.selected = String(index === state.bracelet.selected);
			const cordStyle = cordForCharm(slot.item, state.cordChoices);
			slot.cord.render(cordStyle, slot.anchor, hook, clamp(slot.body.velocity.x * 1.2, -8, 8));
			slot.stem.render(slot.item, { ...position, angle, width, height, cordStyle }); slot.bloom.move(angle);
		});
		this.stage.dataset.frames = String(this.frames);
	}
	private stop() {
		if (this.frame !== undefined) { cancelAnimationFrame(this.frame); }
		this.frame = undefined; this.lastTime = 0; this.accumulated = 0;
		this.stage.dataset.running = 'false';
	}
	private start() {
		if (this.frame !== undefined || !this.active || this.reduced || !this.stage.clientWidth || !this.stage.clientHeight) { return; }
		this.quietFrames = 0; this.stage.dataset.running = 'true';
		const tick = (time: number) => {
			this.frame = undefined;
			if (!this.active || this.reduced || document.hidden) { this.stop(); return; }
			this.accumulated += this.lastTime ? Math.min(50, time - this.lastTime) : 1000 / 60;
			this.lastTime = time;
			while (this.accumulated >= 1000 / 60) {
				Engine.update(this.engine, 1000 / 60);
				for (const slot of this.slots) { this.contain(slot); }
				this.accumulated -= 1000 / 60;
			}
			this.frames++; this.render();
			const moving = this.slots.some(slot => slot.body && (slot.body.speed > .045 || Math.abs(slot.body.angularSpeed) > .001));
			this.quietFrames = moving || this.held ? 0 : this.quietFrames + 1;
			if (this.quietFrames < 35) { this.frame = requestAnimationFrame(tick); }
			else { for (const slot of this.slots) { if (slot.body) { Sleeping.set(slot.body, true); } } this.stop(); }
		};
		this.frame = requestAnimationFrame(tick);
	}
	private sync() {
		const state = this.options.state();
		this.slots.forEach((slot, index) => {
			const shown = this.active && index < this.items.length && !document.hidden;
			if (!shown) { slot.button.dataset.keyboardHeld = 'false'; }
			slot.live.update(slot.item.id, shown, this.reduced, state.caliOutfit);
			slot.fidget.update(slot.item.id, shown, this.reduced, state.puzzles);
			slot.bloom.update({ shape: slot.item.bloom, hook: slot.item.baseAttachment ?? slot.item.attachment,
				visible: shown, reducedMotion: this.reduced });
			slot.cord.setMotion(shown && !this.reduced); slot.material.setActive(shown && !this.reduced);
		});
	}
}
