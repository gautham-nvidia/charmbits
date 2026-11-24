import { artToStage, type ArtDefinition, type ArtPoint } from './live-art-core';

const cloudFile = 'live-art-cloud.png';
const cloudPlane: readonly ArtPoint[] = [[86,180],[931,180],[931,1024],[86,1024]];
export const NIMBUS_ART: ArtDefinition = {
	character: 'cloud', bounds: { x: 86, y: 180, width: 845, height: 656 }, anchor: [554,184],
	parts: [
		{ id: 'sunrise', file: cloudFile, role: 'body', effect: 'weather-back', pivot: [512,500], polygon: cloudPlane },
		{ id: 'cloud', file: cloudFile, role: 'figure', pivot: [512,500],
			polygon: [[80,170],[940,170],[940,845],[80,845]],
			eyes: [{ x: 550, y: 461, rx: 16, ry: 8 }, { x: 667, y: 460, rx: 16, ry: 9 }],
			volume: { x: 512, y: 500, rx: 420, ry: 330, depth: 110 } },
		{ id: 'weather', file: cloudFile, role: 'body', effect: 'weather-front', pivot: [512,500], polygon: cloudPlane },
	],
};
const robotFile = 'live-art-robot-assistant.png';
const robotBounds = { x: 210, y: 165, width: 690, height: 740 };
const robotAnchor: ArtPoint = [507,172];
export const ROBOT_ART: ArtDefinition = {
	character: 'robot', bounds: robotBounds, anchor: robotAnchor,
	attachmentX: artToStage({ bounds: robotBounds }, robotAnchor)[0],
	parts: [
		{ id: 'left-servo', file: robotFile, role: 'servo', side: -1, pivot: [348,560],
			polygon: [[324,532],[373,525],[374,590],[345,635],[328,714],[318,776],[302,838],[229,838],[224,719],[255,607],[295,543]] },
		{ id: 'right-servo', file: robotFile, role: 'servo', side: 1, pivot: [654,561],
			polygon: [[644,535],[689,519],[711,491],[735,444],[777,420],[787,392],[854,386],[894,431],[884,488],[831,530],[780,563],[720,593],[669,598],[647,584]] },
		{ id: 'legs', file: robotFile, role: 'body', pivot: [507,780],
			polygon: [[347,755],[664,755],[664,905],[347,905]] },
		{ id: 'torso', file: robotFile, role: 'body', pivot: [507,644],
			polygon: [[442,490],[571,490],[622,516],[641,538],[654,575],[675,736],[667,764],[635,789],[385,789],[338,760],[342,651],[361,551],[383,519],[442,501]] },
		{ id: 'head', file: robotFile, role: 'head', pivot: [507,491],
			polygon: [[285,164],[729,164],[729,496],[285,496]],
			volume: { x: 507, y: 333, rx: 218, ry: 164, depth: 46 },
			display: { x: 338, y: 219, width: 338, height: 230 } },
	],
};

export function weatherCodeArt(character: string): ArtDefinition | undefined {
	return character === 'cloud' ? NIMBUS_ART : character === 'robot' ? ROBOT_ART : undefined;
}
