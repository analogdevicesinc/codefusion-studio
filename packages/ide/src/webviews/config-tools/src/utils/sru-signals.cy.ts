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
import type {SruInputSignal, SruOutputSignal} from 'cfs-types';
import type {SruFilterState} from '../state/slices/sru/sru.reducer';
import type {SruConnectionEntry} from '../state/slices/sru/sru.selector';
import {
	buildSruSignalCards,
	getOutputStatus,
	getPbenRestoreSignal,
	getPinBufferDirection,
	getPinBufferSignalName,
	groupSruSignalCardsByType,
	isPbenBidirectionalSource,
	isSignalExpandable,
	matchesSruFilter,
	partitionDirectionControlInputs,
	type SruSignalCard
} from './sru-signals';

function makeInput(
	name: string,
	options: {
		IsPinBufferEnable?: boolean;
		Description?: string;
		SignalType?: string;
	} = {}
): SruInputSignal {
	return {
		Name: name,
		Description: name,
		SignalType: 'Clock Signals',
		Config: {},
		...options
	};
}

function makeOutput(
	name: string,
	options: {SignalType?: string} = {}
): SruOutputSignal {
	return {
		Name: name,
		Description: name,
		SignalType: 'Clock Signals',
		...options
	};
}

function makeCard(signal: SruInputSignal): SruSignalCard {
	return {
		signal,
		direction: 'input',
		connections: [],
		editable: true
	};
}

function makeEntry(
	entry: Pick<SruConnectionEntry, 'input' | 'output'> &
		Partial<SruConnectionEntry>
): SruConnectionEntry {
	return {status: 'default', ...entry};
}

const noFilter: SruFilterState = {
	searchText: '',
	statusFilter: 'all'
};

describe('getOutputStatus', () => {
	it('is default when there are no connections', () => {
		expect(getOutputStatus([])).to.equal('default');
	});

	it('is default when every connection is default', () => {
		const connections = [
			makeEntry({input: 'IN0', output: 'OUT0'}),
			makeEntry({input: 'IN1', output: 'OUT0'})
		];

		expect(getOutputStatus(connections)).to.equal('default');
	});

	it('is modified as soon as one connection is modified', () => {
		const connections = [
			makeEntry({input: 'IN0', output: 'OUT0'}),
			makeEntry({input: 'IN1', output: 'OUT0', status: 'modified'})
		];

		expect(getOutputStatus(connections)).to.equal('modified');
	});
});

describe('isSignalExpandable', () => {
	it('is false for a signal with no connections', () => {
		expect(isSignalExpandable([])).to.equal(false);
	});

	it('is true for a signal with at least one connection', () => {
		expect(
			isSignalExpandable([makeEntry({input: 'IN0', output: 'OUT0'})])
		).to.equal(true);
	});
});

describe('partitionDirectionControlInputs', () => {
	it('splits pin-buffer enable inputs from the rest', () => {
		const inputs = [
			makeInput('DAI0_PB01_I'),
			makeInput('DAI0_PBEN01_I', {IsPinBufferEnable: true}),
			makeInput('DAI0_PB02_I')
		];

		const {inputs: rest, directionControls} =
			partitionDirectionControlInputs(inputs);

		expect(rest.map(s => s.Name)).to.deep.equal([
			'DAI0_PB01_I',
			'DAI0_PB02_I'
		]);
		expect(directionControls.map(s => s.Name)).to.deep.equal([
			'DAI0_PBEN01_I'
		]);
	});

	it('returns an empty directionControls array when no input is flagged', () => {
		const inputs = [makeInput('IN0'), makeInput('IN1')];

		const {inputs: rest, directionControls} =
			partitionDirectionControlInputs(inputs);

		expect(rest).to.deep.equal(inputs);
		expect(directionControls).to.deep.equal([]);
	});

	it('preserves order and the full signal objects', () => {
		const flagged = makeInput('DAI0_PBEN01_I', {
			IsPinBufferEnable: true
		});
		const other = makeInput('DAI0_PB01_I');

		const {inputs: rest, directionControls} =
			partitionDirectionControlInputs([flagged, other]);

		expect(rest).to.deep.equal([other]);
		expect(directionControls).to.deep.equal([flagged]);
		expect(directionControls[0]).to.equal(flagged);
	});
});

describe('getPinBufferDirection', () => {
	it('maps LOW to input and HIGH to output', () => {
		expect(getPinBufferDirection('LOW')).to.equal('input');
		expect(getPinBufferDirection('HIGH')).to.equal('output');
	});

	it('treats any other source as bidirectional', () => {
		expect(getPinBufferDirection('DAI0_MISCA0_O')).to.equal(
			'bidirectional'
		);
	});

	it('is undefined when the PBEN has no source', () => {
		expect(getPinBufferDirection(undefined)).to.equal(undefined);
		expect(getPinBufferDirection('')).to.equal(undefined);
	});
});

describe('getPinBufferSignalName', () => {
	it('replaces the PB prefix with PIN', () => {
		expect(getPinBufferSignalName('PB01')).to.equal('PIN01');
		expect(getPinBufferSignalName('PB20')).to.equal('PIN20');
	});

	it('leaves labels without a PB prefix unchanged', () => {
		expect(getPinBufferSignalName('SRC 0')).to.equal('SRC 0');
	});
});

describe('isPbenBidirectionalSource', () => {
	const pben = makeInput('DAI0_PBEN01_I', {IsPinBufferEnable: true});
	const regular = makeInput('DAI0_PB01_I');

	it('is false for a non-PBEN input even with a real signal', () => {
		expect(
			isPbenBidirectionalSource(regular, 'DAI0_MISCA0_O')
		).to.equal(false);
	});

	it('is false for a PBEN sourced from LOW or HIGH', () => {
		expect(isPbenBidirectionalSource(pben, 'LOW')).to.equal(false);
		expect(isPbenBidirectionalSource(pben, 'HIGH')).to.equal(false);
	});

	it('is true for a PBEN sourced from a real signal', () => {
		expect(isPbenBidirectionalSource(pben, 'DAI0_MISCA0_O')).to.equal(
			true
		);
	});

	it('is false when the input or source is missing', () => {
		expect(
			isPbenBidirectionalSource(undefined, 'DAI0_MISCA0_O')
		).to.equal(false);
		expect(isPbenBidirectionalSource(pben, undefined)).to.equal(
			false
		);
	});
});

describe('getPbenRestoreSignal', () => {
	it('prefers the remembered signal when set', () => {
		expect(
			getPbenRestoreSignal('DAI0_MISCA0_O', 'DAI0_MISCA1_O')
		).to.equal('DAI0_MISCA0_O');
	});

	it('falls back to a real SoC default when nothing is remembered', () => {
		expect(getPbenRestoreSignal(undefined, 'DAI0_MISCA1_O')).to.equal(
			'DAI0_MISCA1_O'
		);
	});

	it('returns undefined when neither remembered nor default is a real signal', () => {
		expect(getPbenRestoreSignal(undefined, 'LOW')).to.equal(
			undefined
		);
		expect(getPbenRestoreSignal(undefined, 'HIGH')).to.equal(
			undefined
		);
		expect(getPbenRestoreSignal(undefined, undefined)).to.equal(
			undefined
		);
	});
});

describe('matchesSruFilter', () => {
	it('matches an input card against its own connection status', () => {
		const modifiedInput: SruSignalCard = {
			signal: makeInput('IN0'),
			direction: 'input',
			connections: [
				makeEntry({input: 'IN0', output: 'OUT0', status: 'modified'})
			],
			editable: true
		};

		expect(
			matchesSruFilter(modifiedInput, {
				statusFilter: 'modified'
			})
		).to.equal(true);
		expect(
			matchesSruFilter(modifiedInput, {
				statusFilter: 'default'
			})
		).to.equal(false);
	});

	it('matches an output card against the status derived from its incoming connections', () => {
		const output: SruSignalCard = {
			signal: makeOutput('OUT0'),
			direction: 'output',
			connections: [
				makeEntry({input: 'IN0', output: 'OUT0'}),
				makeEntry({input: 'IN1', output: 'OUT0', status: 'modified'})
			],
			editable: true
		};

		expect(
			matchesSruFilter(output, {
				statusFilter: 'modified'
			})
		).to.equal(true);
		expect(
			matchesSruFilter(output, {statusFilter: 'default'})
		).to.equal(false);
	});

	it('treats a signal with no connections as default', () => {
		const unusedOutput: SruSignalCard = {
			signal: makeOutput('OUT0'),
			direction: 'output',
			connections: [],
			editable: true
		};

		expect(
			matchesSruFilter(unusedOutput, {
				statusFilter: 'default'
			})
		).to.equal(true);
		expect(
			matchesSruFilter(unusedOutput, {
				statusFilter: 'modified'
			})
		).to.equal(false);
	});
});

describe('buildSruSignalCards', () => {
	it('builds one card per signal, tagged with the given direction', () => {
		const signals = [makeInput('IN0'), makeInput('IN1')];

		const cards = buildSruSignalCards(
			signals,
			'input',
			() => [],
			noFilter
		);

		expect(cards.map(card => card.signal.Name)).to.deep.equal([
			'IN0',
			'IN1'
		]);
		expect(cards.every(card => card.direction === 'input')).to.equal(
			true
		);
	});

	it('builds output cards the same way', () => {
		const cards = buildSruSignalCards(
			[makeOutput('OUT0')],
			'output',
			() => [],
			noFilter
		);

		expect(cards[0].direction).to.equal('output');
		expect(cards[0].signal.Name).to.equal('OUT0');
	});

	it('resolves connections for each card through the lookup function', () => {
		const entry = makeEntry({input: 'IN0', output: 'OUT0'});
		const lookup = (name: string) => (name === 'IN0' ? [entry] : []);

		const [card] = buildSruSignalCards(
			[makeInput('IN0')],
			'input',
			lookup,
			noFilter
		);

		expect(card.connections).to.deep.equal([entry]);
	});

	it('drops cards that fail the status filter', () => {
		const signals = [makeInput('IN0'), makeInput('IN1')];
		const lookup = (name: string) =>
			name === 'IN0'
				? [
						makeEntry({
							input: 'IN0',
							output: 'OUT0',
							status: 'modified'
						})
					]
				: [];

		const cards = buildSruSignalCards(signals, 'input', lookup, {
			statusFilter: 'modified'
		});

		expect(cards.map(card => card.signal.Name)).to.deep.equal([
			'IN0'
		]);
	});
});

describe('groupSruSignalCardsByType', () => {
	it('sorts cards alphabetically by signal name within each group', () => {
		const cards = [
			makeCard(makeInput('DAI0_PB02_I')),
			makeCard(makeInput('DAI0_PB01_I')),
			makeCard(makeInput('DAI0_PB03_I'))
		];

		const [group] = groupSruSignalCardsByType(cards);

		expect(group.cards.map(card => card.signal.Name)).to.deep.equal([
			'DAI0_PB01_I',
			'DAI0_PB02_I',
			'DAI0_PB03_I'
		]);
	});

	it('sorts numerically, not lexically, so SIGNAL2 comes before SIGNAL10', () => {
		const cards = [
			makeCard(makeInput('SIGNAL10')),
			makeCard(makeInput('SIGNAL2'))
		];

		const [group] = groupSruSignalCardsByType(cards);

		expect(group.cards.map(card => card.signal.Name)).to.deep.equal([
			'SIGNAL2',
			'SIGNAL10'
		]);
	});

	it('compares the entire number, not just the leading digit', () => {
		const cards = [
			makeCard(makeInput('SIGNAL21')),
			makeCard(makeInput('SIGNAL9')),
			makeCard(makeInput('SIGNAL3'))
		];

		const [group] = groupSruSignalCardsByType(cards);

		expect(group.cards.map(card => card.signal.Name)).to.deep.equal([
			'SIGNAL3',
			'SIGNAL9',
			'SIGNAL21'
		]);
	});

	it('does not change the order groups appear in', () => {
		const cards = [
			makeCard(makeInput('Z0', {SignalType: 'Data Signals'})),
			makeCard(makeInput('A0', {SignalType: 'Clock Signals'})),
			makeCard(makeInput('A1', {SignalType: 'Data Signals'}))
		];

		const groups = groupSruSignalCardsByType(cards);

		expect(groups.map(group => group.signalType)).to.deep.equal([
			'Data Signals',
			'Clock Signals'
		]);
	});
});
