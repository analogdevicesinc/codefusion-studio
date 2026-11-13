/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import type {SruInputSignal} from 'cfs-types';
import type {
	SruNavigationSection,
	SruPeripheralSignalGroup
} from './sru-navigation';
import {
	computeSruSearchMatches,
	type SruGroupScopeMatch
} from './sru-search';
import type {SruConnectionEntry} from '../state/slices/sru/sru.selector';

function makeConnectionByInput(
	entries: Array<
		Pick<SruConnectionEntry, 'input' | 'output'> &
			Partial<SruConnectionEntry>
	>
): Record<string, SruConnectionEntry> {
	return Object.fromEntries(
		entries.map(entry => [entry.input, {status: 'default', ...entry}])
	);
}

const noConnections: Record<string, SruConnectionEntry> = {};

function makeGroup(
	overrides: Partial<SruPeripheralSignalGroup> &
		Pick<SruPeripheralSignalGroup, 'key' | 'name' | 'label'>
): SruPeripheralSignalGroup {
	return {
		peripheralName: 'PERIPH0',
		description: 'Test peripheral',
		inputs: [],
		outputs: [],
		...overrides
	};
}

function makeInput(
	name: string,
	description?: string
): SruInputSignal {
	return {
		Name: name,
		Description: description ?? name,
		SignalType: 'Clock Signals',
		Config: {}
	};
}

const pinBufferSection: SruNavigationSection = {
	kind: 'pinBuffers',
	entries: [
		{
			group: 'DAI0',
			signalGroups: [
				makeGroup({
					key: 'dai0:PB01',
					name: 'DAI0_PB01',
					label: 'PB01',
					peripheralName: 'DAI0',
					inputs: [makeInput('DAI0_PBEN01_I')]
				})
			]
		}
	]
};

const peripheralSection: SruNavigationSection = {
	kind: 'peripherals',
	entries: [
		{
			group: 'ASRC0',
			signalGroups: [
				makeGroup({
					key: 'asrc0:SRC 0',
					name: 'SRC 0',
					label: 'SRC 0',
					peripheralName: 'ASRC0',
					inputs: [makeInput('SRC0_CLK_IP_I', 'Clock input')]
				})
			]
		},
		{
			signalGroups: [
				makeGroup({
					key: 'TIMER0',
					name: 'TIMER0',
					label: 'TIMER0',
					peripheralName: 'TIMER0',
					inputs: [makeInput('TM0_CLK_I')]
				})
			]
		},
		{
			group: 'SPORT',
			signalGroups: [
				makeGroup({
					key: 'SPORT0',
					name: 'SPORT0',
					label: 'SPORT0',
					peripheralName: 'SPORT0',
					inputs: [makeInput('SPT0_CLK_I')]
				}),
				makeGroup({
					key: 'SPORT1',
					name: 'SPORT1',
					label: 'SPORT1',
					peripheralName: 'SPORT1',
					inputs: [makeInput('SPT1_CLK_I')]
				})
			]
		}
	]
};

const sections = [pinBufferSection, peripheralSection];

function groupScopeResultKeys(results: SruGroupScopeMatch[]) {
	return results.map(result =>
		result.kind === 'navigationGroup'
			? `${result.sectionKind}:${result.group}`
			: result.signalGroup.key
	);
}

describe('computeSruSearchMatches', () => {
	it('returns empty results below the minimum search length', () => {
		expect(
			computeSruSearchMatches(sections, 'P', noConnections)
		).to.deep.equal({
			pinBufferGroups: [],
			peripheralGroups: [],
			signalMatches: [],
			descriptionMatches: []
		});
	});

	it('finds a pin-buffer child by label', () => {
		const byLabel = computeSruSearchMatches(
			sections,
			'PB01',
			noConnections
		);
		expect(
			groupScopeResultKeys(byLabel.pinBufferGroups)
		).to.deep.equal(['dai0:PB01']);
	});

	it('returns a pin-buffer navigation-group result alongside a matching child', () => {
		const byGroup = computeSruSearchMatches(
			sections,
			'dai0',
			noConnections
		);
		expect(
			groupScopeResultKeys(byGroup.pinBufferGroups)
		).to.deep.equal(['pinBuffers:DAI0', 'dai0:PB01']);
	});

	it('returns only a peripheral navigation-group result when no child also matches', () => {
		const byGroup = computeSruSearchMatches(
			sections,
			'asrc0',
			noConnections
		);
		expect(
			groupScopeResultKeys(byGroup.peripheralGroups)
		).to.deep.equal(['peripherals:ASRC0']);
	});

	it('returns a peripheral navigation-group result alongside every matching child', () => {
		const byGroupAndChildren = computeSruSearchMatches(
			sections,
			'spo',
			noConnections
		);
		expect(
			groupScopeResultKeys(byGroupAndChildren.peripheralGroups)
		).to.deep.equal(['peripherals:SPORT', 'SPORT0', 'SPORT1']);
	});

	it('finds a child label when its parent navigation group does not match', () => {
		const byChild = computeSruSearchMatches(
			sections,
			'SRC 0',
			noConnections
		);

		expect(
			groupScopeResultKeys(byChild.peripheralGroups)
		).to.deep.equal(['asrc0:SRC 0']);
	});

	it('continues to find a flat peripheral by signal-group name', () => {
		const byName = computeSruSearchMatches(
			sections,
			'TIMER0',
			noConnections
		);
		expect(
			groupScopeResultKeys(byName.peripheralGroups)
		).to.deep.equal(['TIMER0']);
	});

	it('finds signals by name only, ignoring descriptions', () => {
		const signalResults = computeSruSearchMatches(
			sections,
			'SRC0_CLK',
			noConnections
		);
		expect(
			signalResults.signalMatches.map(match => match.signal.Name)
		).to.deep.equal(['SRC0_CLK_IP_I']);

		const byModelDescription = computeSruSearchMatches(
			sections,
			'clock input',
			noConnections
		);
		expect(byModelDescription.signalMatches).to.deep.equal([]);
	});

	it('finds a signal by its user-assigned alias even when the raw name does not match', () => {
		const results = computeSruSearchMatches(
			sections,
			'My Alias',
			noConnections,
			{SRC0_CLK_IP_I: 'My Alias'}
		);

		expect(
			results.signalMatches.map(match => ({
				name: match.signal.Name,
				alias: match.signalAlias
			}))
		).to.deep.equal([{name: 'SRC0_CLK_IP_I', alias: 'My Alias'}]);
	});

	it("includes the signal's alias on a match found by raw name", () => {
		const results = computeSruSearchMatches(
			sections,
			'SRC0_CLK',
			noConnections,
			{SRC0_CLK_IP_I: 'My Alias'}
		);

		expect(results.signalMatches).to.deep.equal([
			{
				signalGroup: peripheralSection.entries[0].signalGroups[0],
				signal:
					peripheralSection.entries[0].signalGroups[0].inputs[0],
				direction: 'input',
				signalAlias: 'My Alias'
			}
		]);
	});

	it('does not match a signal by an alias belonging to a different signal', () => {
		const results = computeSruSearchMatches(
			sections,
			'My Alias',
			noConnections,
			{TM0_CLK_I: 'My Alias'}
		);

		expect(
			results.signalMatches.map(match => match.signal.Name)
		).to.deep.equal(['TM0_CLK_I']);
	});

	it('finds a peripheral-level description match per signal group', () => {
		const results = computeSruSearchMatches(
			sections,
			'Test peripheral',
			noConnections
		);

		expect(
			results.descriptionMatches.map(match => ({
				kind: match.kind,
				key: match.signalGroup.key
			}))
		).to.deep.equal([
			{kind: 'peripheral', key: 'dai0:PB01'},
			{kind: 'peripheral', key: 'asrc0:SRC 0'},
			{kind: 'peripheral', key: 'TIMER0'},
			{kind: 'peripheral', key: 'SPORT0'},
			{kind: 'peripheral', key: 'SPORT1'}
		]);
	});

	it('finds a signal-level description match from the SoC model', () => {
		const results = computeSruSearchMatches(
			sections,
			'Clock input',
			noConnections
		);

		expect(results.descriptionMatches).to.deep.equal([
			{
				kind: 'signal',
				signalGroup: peripheralSection.entries[0].signalGroups[0],
				signal:
					peripheralSection.entries[0].signalGroups[0].inputs[0],
				direction: 'input'
			}
		]);
	});

	it('finds a connection-comment match by its user-authored description', () => {
		const connectionsByInput = makeConnectionByInput([
			{
				input: 'SRC0_CLK_IP_I',
				output: 'PCG0_CLKA_O',
				description: 'Route PCG A clock to the ASRC'
			}
		]);

		const results = computeSruSearchMatches(
			sections,
			'Route PCG A',
			connectionsByInput
		);

		expect(results.descriptionMatches).to.deep.equal([
			{
				kind: 'connection',
				signalGroup: peripheralSection.entries[0].signalGroups[0],
				input: peripheralSection.entries[0].signalGroups[0].inputs[0],
				output: 'PCG0_CLKA_O',
				description: 'Route PCG A clock to the ASRC'
			}
		]);
	});

	it('ignores connections with no user-authored description', () => {
		const connectionsByInput = makeConnectionByInput([
			{input: 'SRC0_CLK_IP_I', output: 'PCG0_CLKA_O'}
		]);

		const results = computeSruSearchMatches(
			sections,
			'PCG0_CLKA_O',
			connectionsByInput
		);

		expect(results.descriptionMatches).to.deep.equal([]);
	});
});
