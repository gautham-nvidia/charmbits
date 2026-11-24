import { test, expect, type ElectronApplication, type Frame, type Page, type TestInfo } from '@playwright/test';
import { cpSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

export async function captureEditorFailure(window: Page, testInfo: TestInfo, error: unknown) {
	// Save the triggering error before asking a stalled renderer for a screenshot.
	writeFileSync(testInfo.outputPath('original-error.json'), JSON.stringify({
		message: String(error), stack: error instanceof Error ? error.stack : undefined,
		frames: window.frames().map(frame => ({ url: frame.url(), detached: frame.isDetached() })),
	}, null, 2));
	const snapshots: unknown[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			Promise.all(window.frames().map(async frame => {
				try {
					snapshots.push(await frame.evaluate(() => {
						const details = (id: string) => {
							const node = document.getElementById(id);
							if (!node) { return null; }
							return {
								hidden: node.hidden, display: getComputedStyle(node).display,
								bounds: node.getBoundingClientRect().toJSON(),
							};
						};
						return {
							url: location.href, visibility: document.visibilityState,
							focus: document.activeElement?.id, documentFocused: document.hasFocus(),
							viewport: { width: innerWidth, height: innerHeight },
							stage: { ...document.getElementById('stage')?.dataset },
							selected: (document.getElementById('charm-select') as HTMLSelectElement | null)?.value,
							appearance: details('settings'), menu: details('settings-menu'),
							weather: details('weather-settings'),
							careCue: details('care-cue'), careDone: details('care-done'),
							pointerEvents: JSON.parse(document.documentElement.dataset.pointerTrace ?? '[]'),
							saveMessages: JSON.parse(document.documentElement.dataset.saveTrace ?? '[]'),
						};
					}));
				} catch (captureError) { snapshots.push({ url: frame.url(), error: String(captureError) }); }
			})),
			new Promise<void>(resolve => { timer = setTimeout(resolve, 3000); }),
		]);
		writeFileSync(testInfo.outputPath('frame-state.json'), JSON.stringify(snapshots, null, 2));
	} finally { if (timer) { clearTimeout(timer); } }
	try {
		await window.screenshot({ path: testInfo.outputPath('failure.png'), timeout: 3000 });
	} catch (captureError) {
		writeFileSync(testInfo.outputPath('failure-capture.txt'), String(captureError));
	}
}

export async function closeOwnedEditor(editor: { app: ElectronApplication; profile: string }, testInfo: TestInfo) {
	try {
		// A blocked native shutdown must not swallow the original test failure.
		let timer: ReturnType<typeof setTimeout> | undefined;
		const closed = await Promise.race([
			editor.app.close().then(() => true),
			new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), 10000); }),
		]).finally(() => { if (timer) { clearTimeout(timer); } });
		if (!closed) {
			writeFileSync(testInfo.outputPath('editor-shutdown.json'), JSON.stringify({
				profile: editor.profile, pid: editor.app.process().pid, gracefulShutdownTimedOut: true,
			}));
			editor.app.process().kill('SIGKILL');
		}
	} finally {
		const editorLogs = join(editor.profile, 'user', 'logs');
		if (existsSync(editorLogs)) {
			try { cpSync(editorLogs, testInfo.outputPath('editor-logs'), { recursive: true }); } catch { /* Keep test result. */ }
		}
	}
}
