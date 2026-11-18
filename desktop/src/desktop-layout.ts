import { clamp, getLayout as sharedLayout } from '../../extension/src/charm-state';
export * from '../../extension/src/charm-state';

type Layout = ReturnType<typeof sharedLayout>;

/** Keep the shared bounce and collision behavior, with the monitor as the desktop play area. */
export function placeDesktopAnchor(layout: Layout, anchor: { x: number; y: number }): Layout {
	const inset = layout.visualRadius + layout.edgePadding;
	const swingRoom = Math.min(40, Math.max(0, (layout.width - 2 * inset) / 2));
	const anchorX = clamp(anchor.x, inset + swingRoom, layout.width - inset - swingRoom);
	const restingSpace = Math.max(200, layout.minimumCord + layout.attachmentOffset
		+ layout.visualRadius + layout.edgePadding + layout.pullAllowance);
	const anchorY = clamp(anchor.y, layout.mode === 'orbit' ? layout.anchorY : 3, layout.height - restingSpace);
	const maximumDragCord = Math.max(layout.minimumCord, layout.height - anchorY - layout.attachmentOffset - layout.visualRadius - layout.edgePadding);
	const maximumCord = Math.max(layout.minimumCord, maximumDragCord - layout.pullAllowance);
	return { ...layout, anchorX, anchorY, maximumDragCord, maximumCord,
		cordLength: clamp(layout.cordLength, layout.minimumCord, maximumCord) };
}

export function getLayout(...args: Parameters<typeof sharedLayout>): Layout {
	const layout = sharedLayout(...args);
	if (typeof document === 'undefined') { return layout; }
	const x = Number(document.body.dataset.desktopAnchorX);
	const y = Number(document.body.dataset.desktopAnchorY);
	return Number.isFinite(x) && Number.isFinite(y) ? placeDesktopAnchor(layout, { x, y }) : layout;
}
