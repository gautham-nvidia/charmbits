import type { BraceletState } from './bracelet-core';
import type { CharmDefinition } from './charm-catalog';

interface Options {
	state(): BraceletState;
	catalogue(): readonly CharmDefinition[];
	change(next: BraceletState): void;
}

export function createBraceletControls(container: HTMLElement, options: Options) {
	container.setAttribute('role', 'group');
	container.setAttribute('aria-label', 'Bracelet charms');
	const rows = Array.from({ length: 3 }, (_, index) => {
		const row = document.createElement('div'), label = document.createElement('label');
		row.className = 'bracelet-choice';
		const select = document.createElement('select');
		select.id = `bracelet-choice-${index}`;
		label.htmlFor = select.id; label.textContent = `Charm ${index + 1}`;
		const button = (text: string, name: string, action: () => void) => {
			const control = document.createElement('button');
			control.type = 'button'; control.textContent = text;
			control.setAttribute('aria-label', `${name} charm ${index + 1}`);
			control.addEventListener('click', action);
			return control;
		};
		const move = (direction: number) => {
			const current = options.state(), target = index + direction;
			if (target < 0 || target >= current.charms.length) { return; }
			const charms = [...current.charms];
			[charms[index], charms[target]] = [charms[target], charms[index]];
			const selected = current.selected === index ? target : current.selected === target ? index : current.selected;
			options.change({ charms, selected });
		};
		const left = button('←', 'Move left', () => move(-1));
		const right = button('→', 'Move right', () => move(1));
		const remove = button('×', 'Remove', () => {
			const current = options.state();
			if (current.charms.length <= 2) { return; }
			const charms = current.charms.filter((_, position) => position !== index);
			options.change({ charms, selected: Math.min(charms.length - 1, current.selected - (index < current.selected ? 1 : 0)) });
		});
		select.addEventListener('change', () => {
			const charms = [...options.state().charms]; charms[index] = select.value;
			options.change({ charms, selected: index });
		});
		row.append(label, select, left, right, remove); container.append(row);
		return { row, select, left, right, remove };
	});
	const add = document.createElement('button');
	add.type = 'button'; add.textContent = 'Add a charm'; add.id = 'bracelet-add';
	add.addEventListener('click', () => {
		const current = options.state();
		if (current.charms.length >= 3) { return; }
		const next = options.catalogue().find(charm => !current.charms.includes(charm.id));
		if (next) { options.change({ charms: [...current.charms, next.id], selected: current.charms.length }); }
	});
	const hint = document.createElement('p');
	hint.className = 'companion-hint';
	hint.textContent = 'Two or three charms, sized to fit. Tap a charm to select its slot, then change its cord or choose another charm.';
	container.append(add, hint);
	let catalogueKey = '';
	return {
		render() {
			const state = options.state(), catalogue = options.catalogue();
			const key = catalogue.map(charm => `${charm.id}:${charm.name}`).join('\n');
			if (key !== catalogueKey) {
				catalogueKey = key;
				for (const row of rows) { row.select.replaceChildren(...catalogue.map(charm => new Option(charm.name, charm.id))); }
			}
			rows.forEach((row, index) => {
				const id = state.charms[index]; row.row.hidden = !id;
				row.row.dataset.selected = String(index === state.selected);
				for (const option of row.select.querySelectorAll('[data-unavailable]')) { option.remove(); }
				if (id && !catalogue.some(charm => charm.id === id)) {
					const option = new Option('Saved charm (unavailable)', id); option.dataset.unavailable = 'true'; row.select.add(option);
				}
				row.select.value = id ?? '';
				row.left.disabled = index === 0;
				row.right.disabled = index >= state.charms.length - 1;
				row.remove.disabled = state.charms.length <= 2;
			});
			add.disabled = state.charms.length >= 3;
		},
	};
}
