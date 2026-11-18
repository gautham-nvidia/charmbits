import { test, expect, type Frame, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

export const primaryModifier = process.platform === 'darwin' ? 'Meta' : 'Control';
export const endOfDocument = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';

export function isolatedEditorEnvironment(): Record<string, string> {
	const environment: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		// Editor-launched terminals carry their parent's IPC hooks, entry point
		// and compile cache. A disposable host must establish its own runtime.
		if (value !== undefined && !key.startsWith('VSCODE_')
			&& key !== 'ELECTRON_RUN_AS_NODE' && key !== 'DEVIN_FD_PATH') {
			environment[key] = value;
		}
	}
	return environment;
}

export function commandInput(window: Page) {
	const widget = window.locator('.quick-input-widget');
	return widget.getByRole('combobox').or(widget.getByRole('textbox'));
}

export async function command(window: Page, title: string) {
	if (title === 'Developer: Reload Window') {
		const frame = await readyFrame(window);
		await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true', { timeout: 10000 });
		await expect(frame.locator('#stage')).toHaveAttribute('data-companion-persisted', 'true', { timeout: 10000 });
		await frame.evaluate(() => {
			const capture = (window as unknown as { __charmletRecordPreference?: (value: unknown) => Promise<void> }).__charmletRecordPreference;
			const stage = document.getElementById('stage');
			const picker = document.getElementById('charm-select') as HTMLSelectElement | null;
			if (capture) {
				void capture({
					time: Date.now(), label: 'before-reload-command', picker: picker?.value,
					charm: stage?.dataset.charm, persisted: stage?.dataset.persisted,
				}).catch(() => {});
			}
		});
	}
	await window.keyboard.press(`${primaryModifier}+Shift+P`);
	const input = commandInput(window);
	await expect(input).toBeVisible();
	await input.fill('>');
	await input.pressSequentially(title, { delay: 15 });
	await window.locator('.quick-input-list').getByText(title, { exact: true }).click();
}

export async function readyFrame(window: Page, excluded: ReadonlySet<Frame> = new Set<Frame>()): Promise<Frame> {
	let result: Frame | undefined;
	try {
		await expect.poll(async () => {
			for (const frame of window.frames()) {
				if (excluded.has(frame) || frame.isDetached()) { continue; }
				try {
					if (await frame.locator('#stage[data-ready="true"]').isVisible() && !frame.isDetached()) {
						result = frame;
						return true;
					}
				} catch (error) {
					if (!frame.isDetached()) { throw error; }
				}
			}
			return false;
		}, { timeout: 30000 }).toBe(true);
	} catch (error) {
		try {
			writeFileSync(test.info().outputPath('webview-readiness.json'), JSON.stringify({
				body: await window.locator('body').innerText({ timeout: 3000 }),
				frames: window.frames().map(frame => ({ url: frame.url(), detached: frame.isDetached() })),
			}, null, 2));
			await window.screenshot({ path: test.info().outputPath('webview-readiness.png'), timeout: 3000 });
		} catch { /* Preserve the readiness failure if the host has already closed. */ }
		throw error;
	}
	if (!result) {
		throw new Error('CharmBits did not create a ready webview.');
	}
	return result;
}

export async function reloadCharm(window: Page): Promise<Frame> {
	const previous = new Set(window.frames());
	await Promise.all([
		window.waitForEvent('domcontentloaded', { timeout: 30000 }),
		command(window, 'Developer: Reload Window'),
	]);
	return readyFrame(window, previous);
}
