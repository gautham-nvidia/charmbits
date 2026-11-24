import { BLOOM_COLUMNS, BLOOM_ROWS, bloomPoint, type BloomShape } from './bloom-motion';
import { DEFAULT_ATTACHMENT, type CharmAttachment } from './charm-attachment';
import { drawTextureMesh, type TextureMesh } from './live-art-renderer';

interface BloomViewState {
	shape?: BloomShape;
	hook?: CharmAttachment;
	visible: boolean;
	reducedMotion: boolean;
}

function flowerMesh(source: HTMLCanvasElement): TextureMesh {
	const uv: number[] = [], indices: number[] = [];
	for (let row = 0; row <= BLOOM_ROWS; row++) {
		for (let column = 0; column <= BLOOM_COLUMNS; column++) {
			uv.push(column / BLOOM_COLUMNS, row / BLOOM_ROWS);
			if (row === BLOOM_ROWS || column === BLOOM_COLUMNS) { continue; }
			const a = row * (BLOOM_COLUMNS + 1) + column, b = a + BLOOM_COLUMNS + 1;
			indices.push(a, b, a + 1, b, b + 1, a + 1);
		}
	}
	return { image: source, uv: new Float32Array(uv), indices: new Uint16Array(indices),
		positions: new Float32Array(uv.length) };
}

/** A gently curved petal surface. The green attachment stays fixed during every pose. */
export function createBloomView(charm: HTMLElement, image: HTMLImageElement) {
	const canvas = document.createElement('canvas');
	canvas.id = 'live-bloom'; canvas.width = 216; canvas.height = 252;
	canvas.hidden = true; canvas.setAttribute('aria-hidden', 'true'); charm.append(canvas);
	const context = canvas.getContext('2d');
	let mesh: TextureMesh | undefined, shape: BloomShape | undefined;
	let hook: CharmAttachment = DEFAULT_ATTACHMENT;
	let visible = false, reduced = false, disposed = false, source = '';
	let generation = 0, frames = 0, sway = 0, started = 0, reaction = 0;
	let timer: number | undefined;

	function stop() {
		if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; }
		canvas.dataset.motion = 'still';
	}
	function paint() {
		stop();
		if (!context || !mesh || !shape || !visible || document.hidden || disposed) { return; }
		const now = performance.now(), seconds = reduced ? 0 : (now - started) / 1000;
		const progress = reaction ? Math.max(0, Math.min(1, (now - reaction) / 1600)) : 1;
		const opening = reduced ? 0 : Math.sin(progress * Math.PI);
		context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
		if (reduced) { context.drawImage(mesh.image, 0, 0); }
		else {
			for (let index = 0; index < mesh.uv.length; index += 2) {
				const point = bloomPoint([mesh.uv[index], mesh.uv[index + 1]], shape, hook, { seconds, opening, sway });
				mesh.positions[index] = point[0] * 72; mesh.positions[index + 1] = point[1] * 84;
			}
			drawTextureMesh(context, mesh);
			context.save(); context.globalCompositeOperation = 'source-atop';
			const light = context.createLinearGradient(0, 0, canvas.width, canvas.height);
			light.addColorStop(0, '#fff5d914');
			light.addColorStop(.45 + Math.sin(seconds * .43) * .15, '#ffffff00');
			light.addColorStop(1, '#1530230c');
			context.fillStyle = light; context.fillRect(0, 0, canvas.width, canvas.height); context.restore();
		}
		canvas.hidden = false; charm.dataset.bloomRendered = 'true';
		canvas.dataset.frames = String(++frames);
		canvas.dataset.opening = opening.toFixed(3);
		canvas.dataset.motion = reduced ? 'still' : 'living';
		if (!reduced) { timer = window.setTimeout(paint, progress < 1 ? 33 : 100); }
	}
	async function prepare(url: string) {
		const current = ++generation;
		mesh = undefined; canvas.hidden = true; charm.dataset.bloomRendered = 'false';
		try {
			const decoded = new Image(); decoded.src = url; await decoded.decode();
			if (current !== generation || disposed || !shape || !context) { return; }
			// Keep the larger website preview sharp without enlarging editor textures.
			canvas.width = decoded.naturalWidth >= 432 ? 432 : 216;
			canvas.height = canvas.width * 7 / 6;
			const texture = document.createElement('canvas'); texture.width = canvas.width; texture.height = canvas.height;
			texture.getContext('2d')!.drawImage(decoded, 0, 0, texture.width, texture.height);
			mesh = flowerMesh(texture); started = performance.now(); paint();
		} catch {
			// A failed decorative surface keeps the original image and all charm controls usable.
			if (current === generation) { canvas.hidden = true; charm.dataset.bloomRendered = 'false'; }
		}
	}
	const visibility = () => { if (document.hidden) { stop(); } else { paint(); } };
	const dispose = () => {
		disposed = true; generation++; stop(); canvas.remove();
		document.removeEventListener('visibilitychange', visibility);
		window.removeEventListener('pagehide', stop);
		window.removeEventListener('pageshow', paint);
	};
	document.addEventListener('visibilitychange', visibility);
	window.addEventListener('pagehide', stop);
	window.addEventListener('pageshow', paint);
	return {
		update(state: BloomViewState) {
			const changed = visible !== state.visible || reduced !== state.reducedMotion || shape !== state.shape;
			visible = state.visible; reduced = state.reducedMotion; shape = state.shape;
			hook = state.hook ?? DEFAULT_ATTACHMENT;
			canvas.style.transformOrigin = `${hook.x * 100}% ${hook.y * 100}%`;
			if (!shape) {
				if (source) { generation++; source = ''; mesh = undefined; }
				stop(); canvas.hidden = true; charm.dataset.bloomRendered = 'false'; return;
			}
			if (source !== image.src) { source = image.src; stop(); void prepare(source); }
			else if (changed) { if (reduced) { reaction = 0; } paint(); }
			if (!visible) { stop(); }
		},
		move(angle: number) { sway = Math.max(-1, Math.min(1, angle * 2)); },
		play() {
			if (shape && visible && !reduced && !document.hidden) { reaction = performance.now(); paint(); }
		},
		dispose,
	};
}
