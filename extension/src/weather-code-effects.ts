import { artReaction, type ArtBounds, type ArtPose } from './live-art-core';

function weather(pose: ArtPose): 'sunrise' | 'rain' | 'lightning' | 'night' | 'snow' | undefined {
	if (pose.weather) {
		return pose.weather === 'sunny' ? 'sunrise' : pose.weather === 'storm' ? 'lightning'
			: pose.weather === 'cloudy' ? undefined : pose.weather;
	}
	if (pose.pressed) { return 'rain'; }
	if (pose.gesture === 'sunrise' || pose.gesture === 'rain' || pose.gesture === 'lightning') { return pose.gesture; }
	return pose.happy || pose.greeting ? 'sunrise' : undefined;
}

export function paintWeather(context: CanvasRenderingContext2D, pose: ArtPose, plane: 'weather-back' | 'weather-front'): void {
	const kind = weather(pose);
	if (!kind) { return; }
	const amount = pose.weather || pose.pressed ? 1 : artReaction(pose);
	const phase = pose.reducedMotion ? .5 : Math.max(0, Math.min(1, pose.reactionProgress ?? .5));
	context.globalAlpha = amount;
	if (plane === 'weather-back') {
		if (kind === 'night') {
			context.fillStyle = '#dfebf6'; context.beginPath(); context.arc(285,315,85,0,Math.PI*2); context.fill();
			context.globalCompositeOperation = 'destination-out';
			context.beginPath(); context.arc(322,283,75,0,Math.PI*2); context.fill();
			context.globalCompositeOperation = 'source-over';
			return;
		}
		if (kind !== 'sunrise') { return; }
		const x = 285, y = 420 - (pose.reducedMotion ? 1 : Math.min(1, phase * 3)) * 110;
		const halo = context.createRadialGradient(x, y, 65, x, y, 145);
		halo.addColorStop(0, '#ffc663aa'); halo.addColorStop(1, '#ffc66300');
		context.fillStyle = halo; context.beginPath(); context.arc(x, y, 145, 0, Math.PI * 2); context.fill();
		const sun = context.createRadialGradient(x - 30, y - 35, 10, x, y, 96);
		sun.addColorStop(0, '#fff6bf'); sun.addColorStop(.6, '#ffd06d'); sun.addColorStop(1, '#ee9a4c');
		context.fillStyle = sun; context.beginPath(); context.arc(x, y, 96, 0, Math.PI * 2); context.fill();
		return;
	}
	if (kind === 'snow') {
		const time = pose.reducedMotion ? 0 : (pose.now ?? 0) / 1800;
		context.strokeStyle = '#d8f1ff'; context.lineWidth = 4; context.lineCap = 'round';
		for (let index = 0; index < 6; index++) {
			const fall = (time + index * .17) % 1, x = 270 + index * 90, y = 834 + fall * 110;
			context.beginPath(); context.moveTo(x - 9,y); context.lineTo(x + 9,y);
			context.moveTo(x,y - 9); context.lineTo(x,y + 9); context.stroke();
		}
		return;
	}
	if (kind === 'rain' || kind === 'lightning') {
		const time = pose.reducedMotion ? 0 : (pose.now ?? 0) / 720;
		const count = kind === 'rain' ? 7 : 4;
		for (let index = 0; index < count; index++) {
			const fall = (time + index * .19) % 1;
			const x = 250 + index * (kind === 'rain' ? 80 : 145) - fall * 14;
			const y = 832 + fall * 122;
			context.globalAlpha = amount * (.55 + Math.sin(fall * Math.PI) * .45);
			context.fillStyle = '#6bc5f2'; context.strokeStyle = '#c9edff'; context.lineWidth = 3;
			context.beginPath(); context.moveTo(x + 9, y);
			context.bezierCurveTo(x + 2, y + 13, x - 11, y + 23, x - 9, y + 31);
			context.bezierCurveTo(x - 6, y + 44, x + 12, y + 41, x + 13, y + 29);
			context.closePath(); context.fill(); context.stroke();
		}
	}
	if (kind === 'lightning') {
		// One local bolt and a gentle glow; no repeated or full-canvas flashes.
		context.globalAlpha = amount;
		context.shadowColor = '#ffd979'; context.shadowBlur = pose.reducedMotion ? 0 : 12;
		context.fillStyle = '#ffe594'; context.strokeStyle = '#d49d39'; context.lineWidth = 3;
		context.beginPath(); context.moveTo(545,768); context.lineTo(482,888); context.lineTo(531,880);
		context.lineTo(485,999); context.lineTo(620,836); context.lineTo(565,846);
		context.lineTo(605,768); context.closePath(); context.fill(); context.stroke();
	}
}

export function paintRobotDisplay(context: CanvasRenderingContext2D, pose: ArtPose, display: ArtBounds): void {
	const { x, y, width, height } = display;
	context.beginPath(); context.roundRect(x, y, width, height, height * .3); context.clip();
	const glass = context.createLinearGradient(x, y, x, y + height);
	glass.addColorStop(0, '#303637'); glass.addColorStop(1, '#141c1e');
	context.fillStyle = glass; context.fillRect(x, y, width, height);
	const cheerful = pose.happy || pose.gesture === 'cheer';
	const encouraging = pose.greeting || pose.gesture === 'encourage';
	const thinking = pose.gesture === 'think';
	const gaze = pose.reducedMotion ? 0 : pose.gazeX * 8;
	const centre = x + width / 2 + gaze + (thinking ? -8 : 0);
	const eyeY = y + height * .49 + (pose.reducedMotion ? 0 : pose.gazeY * 5) - (thinking ? 6 : 0);
	const radius = height * .065;
	context.fillStyle = cheerful ? '#b4edc3' : '#93d5e4';
	context.strokeStyle = context.fillStyle;
	context.shadowColor = cheerful ? '#8bdca6' : '#6dc9df';
	context.shadowBlur = 13; context.lineWidth = height * .035; context.lineCap = 'round';
	for (const side of [-1, 1]) {
		const eyeX = centre + side * width * .21;
		const closed = pose.pressed || pose.blink > .6 || side === -1 && (pose.wink || encouraging);
		context.beginPath();
		if (closed || cheerful) {
			context.moveTo(eyeX - radius, eyeY + radius * .2);
			context.quadraticCurveTo(eyeX, eyeY - radius * (cheerful ? .8 : .15), eyeX + radius, eyeY + radius * .2);
			context.stroke();
		} else {
			context.ellipse(eyeX, eyeY, radius, radius * (thinking && side === 1 ? .6 : 1), 0, 0, Math.PI * 2);
			context.fill();
		}
	}
	if (cheerful || encouraging) {
		context.shadowBlur = 5; context.lineWidth = height * .026;
		context.beginPath(); context.moveTo(centre - width * .09, y + height * .69);
		context.quadraticCurveTo(centre, y + height * .79, centre + width * .09, y + height * .69);
		context.stroke();
	}
}
