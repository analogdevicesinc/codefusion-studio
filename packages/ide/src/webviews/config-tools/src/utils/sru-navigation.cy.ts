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
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '@common/types/soc';
import type {SruInputSignal, SruOutputSignal} from 'cfs-types';
import {groupSruSignals} from './sru-navigation';

function makeInput(
	name: string,
	group?: string,
	options?: {IsPinBufferEnable?: boolean}
): SruInputSignal {
	return {
		Name: name,
		Description: name,
		SignalType: 'Clock Signals',
		Config: {},
		PeripheralSubGroup: group,
		IsPinBufferEnable: options?.IsPinBufferEnable
	};
}

function makeOutput(name: string, group?: string): SruOutputSignal {
	return {
		Name: name,
		Description: name,
		SignalType: 'Clock Signals',
		PeripheralSubGroup: group
	};
}

function makePeripheral(
	overrides: Partial<
		FormattedPeripheral<FormattedPeripheralSignal>
	> & {
		name: string;
	}
): FormattedPeripheral<FormattedPeripheralSignal> {
	return {
		description: overrides.name,
		signals: {},
		assignable: true,
		...overrides
	};
}

describe('groupSruSignals', () => {
	it('collects a peripheral-level group and orders its signal groups alphabetically', () => {
		const sport0 = makePeripheral({
			name: 'SPORT0',
			group: 'SPORT',
			sru: {
				Inputs: [
					makeInput('SPT0A_CLK_I', 'SPORT 0A'),
					makeInput('SPT0B_CLK_I', 'SPORT 0B')
				],
				Outputs: [
					makeOutput('SPT0A_CLK_O', 'SPORT 0A'),
					makeOutput('SPT0B_CLK_O', 'SPORT 0B')
				]
			}
		});
		const sport1 = makePeripheral({
			name: 'SPORT1',
			group: 'SPORT',
			sru: {
				Inputs: [makeInput('SPT1A_CLK_I', 'SPORT 1A')],
				Outputs: [makeOutput('SPT1A_CLK_O', 'SPORT 1A')]
			}
		});

		const sections = groupSruSignals([sport0, sport1]);

		expect(sections).to.have.length(1);
		expect(sections[0].kind).to.equal('peripherals');
		expect(sections[0].entries).to.have.length(1);
		expect(sections[0].entries[0].group).to.equal('SPORT');
		expect(
			sections[0].entries[0].signalGroups.map(
				signalGroup => signalGroup.name
			)
		).to.deep.equal(['SPORT 0A', 'SPORT 0B', 'SPORT 1A']);
	});

	it('collects the signals themselves into each signal group', () => {
		const peripheral = makePeripheral({
			name: 'ASRC0',
			sru: {
				Inputs: [
					makeInput('IN0', 'SRC 0'),
					makeInput('IN1', 'SRC 0'),
					makeInput('IN2', 'SRC 1')
				],
				Outputs: [makeOutput('OUT0', 'SRC 0')]
			}
		});

		const [{entries}] = groupSruSignals([peripheral]);
		const [group] = entries;
		const src0 = group.signalGroups.find(
			signalGroup => signalGroup.name === 'SRC 0'
		);
		const src1 = group.signalGroups.find(
			signalGroup => signalGroup.name === 'SRC 1'
		);

		expect(src0?.inputs.map(signal => signal.Name)).to.deep.equal([
			'IN0',
			'IN1'
		]);
		expect(src0?.outputs.map(signal => signal.Name)).to.deep.equal([
			'OUT0'
		]);
		expect(src1?.inputs.map(signal => signal.Name)).to.deep.equal([
			'IN2'
		]);
		expect(src1?.outputs).to.deep.equal([]);
	});

	it('records the owning peripheral name and description on every signal group', () => {
		const peripheral = makePeripheral({
			name: 'SPORT0',
			description: 'Synchronous Serial Port',
			group: 'SPORT',
			sru: {
				Inputs: [makeInput('SPT0A_CLK_I', 'SPORT 0A')],
				Outputs: [makeOutput('SPT0B_CLK_O', 'SPORT 0B')]
			}
		});

		const [{entries}] = groupSruSignals([peripheral]);
		const [group] = entries;

		for (const signalGroup of group.signalGroups) {
			expect(signalGroup.peripheralName).to.equal('SPORT0');
			expect(signalGroup.description).to.equal(
				'Synchronous Serial Port'
			);
		}
	});

	it('collapses a fully-ungrouped peripheral into a single fallback signal group named after it', () => {
		const pdm0 = makePeripheral({
			name: 'PDM0',
			sru: {
				Inputs: [makeInput('PDM0_CLK_I'), makeInput('PDM0_DATA0_I')],
				Outputs: [makeOutput('PDM0_CLK_O')]
			}
		});

		const [{entries}] = groupSruSignals([pdm0]);
		const [group] = entries;

		expect(group.signalGroups).to.have.length(1);
		expect(group.signalGroups[0]).to.include({
			key: 'PDM0',
			name: 'PDM0',
			label: 'PDM0',
			peripheralName: 'PDM0'
		});
		expect(
			group.signalGroups[0].inputs.map(signal => signal.Name)
		).to.deep.equal(['PDM0_CLK_I', 'PDM0_DATA0_I']);
		expect(
			group.signalGroups[0].outputs.map(signal => signal.Name)
		).to.deep.equal(['PDM0_CLK_O']);
	});

	it('splits pin-buffer subgroups into their own section and leaves the ungrouped fallback flat in peripherals', () => {
		const dai0 = makePeripheral({
			name: 'DAI0',
			sru: {
				Inputs: [
					makeInput('DAI0_PB01_I', 'DAI0_PB01'),
					makeInput('DAI0_PBEN01_I', 'DAI0_PB01', {
						IsPinBufferEnable: true
					}),
					makeInput('DAI0_MISCA0_I')
				],
				Outputs: [
					makeOutput('DAI0_PB01_O', 'DAI0_PB01'),
					makeOutput('LOW')
				]
			}
		});

		const sections = groupSruSignals([dai0]);

		expect(sections.map(section => section.kind)).to.deep.equal([
			'pinBuffers',
			'peripherals'
		]);

		const [pinBuffers, peripherals] = sections;

		expect(pinBuffers.entries).to.have.length(1);
		expect(pinBuffers.entries[0].group).to.equal('DAI0');
		expect(
			pinBuffers.entries[0].signalGroups.map(
				signalGroup => signalGroup.name
			)
		).to.deep.equal(['DAI0_PB01']);

		expect(peripherals.entries).to.have.length(1);
		expect(peripherals.entries[0].group).to.equal(undefined);
		expect(
			peripherals.entries[0].signalGroups.map(
				signalGroup => signalGroup.name
			)
		).to.deep.equal(['DAI0']);

		const fallback = peripherals.entries[0].signalGroups[0];
		expect(fallback.inputs.map(signal => signal.Name)).to.deep.equal([
			'DAI0_MISCA0_I'
		]);
		expect(fallback.outputs.map(signal => signal.Name)).to.deep.equal(
			['LOW']
		);
	});

	it('strips the peripheral-name prefix from pin-buffer labels and leaves other labels equal to name', () => {
		const dai0 = makePeripheral({
			name: 'DAI0',
			sru: {
				Inputs: [
					makeInput('DAI0_PB01_I', 'DAI0_PB01'),
					makeInput('DAI0_PBEN01_I', 'DAI0_PB01', {
						IsPinBufferEnable: true
					})
				],
				Outputs: [makeOutput('DAI0_PB01_O', 'DAI0_PB01')]
			}
		});
		const asrc0 = makePeripheral({
			name: 'ASRC0',
			sru: {
				Inputs: [makeInput('IN0', 'SRC 0')],
				Outputs: []
			}
		});

		const sections = groupSruSignals([dai0, asrc0]);
		const pinBuffers = sections.find(
			section => section.kind === 'pinBuffers'
		);
		const peripherals = sections.find(
			section => section.kind === 'peripherals'
		);

		expect(pinBuffers?.entries[0].signalGroups[0]).to.include({
			name: 'DAI0_PB01',
			label: 'PB01'
		});
		expect(peripherals?.entries[0].signalGroups[0]).to.include({
			name: 'SRC 0',
			label: 'SRC 0'
		});
	});

	it('moves an entire subgroup into pinBuffers when only one of its inputs carries IsPinBufferEnable', () => {
		const dai0 = makePeripheral({
			name: 'DAI0',
			sru: {
				Inputs: [
					makeInput('DAI0_PB01_I', 'DAI0_PB01'),
					makeInput('DAI0_PBEN01_I', 'DAI0_PB01', {
						IsPinBufferEnable: true
					})
				],
				Outputs: [makeOutput('DAI0_PB01_O', 'DAI0_PB01')]
			}
		});

		const [pinBuffers] = groupSruSignals([dai0]);
		const [signalGroup] = pinBuffers.entries[0].signalGroups;

		expect(pinBuffers.kind).to.equal('pinBuffers');
		expect(signalGroup.name).to.equal('DAI0_PB01');
		expect(
			signalGroup.inputs.map(signal => signal.Name)
		).to.deep.equal(['DAI0_PB01_I', 'DAI0_PBEN01_I']);
		expect(
			signalGroup.outputs.map(signal => signal.Name)
		).to.deep.equal(['DAI0_PB01_O']);
	});

	it('omits the pinBuffers section for a pin-buffer-free SoC', () => {
		const asrc0 = makePeripheral({
			name: 'ASRC0',
			sru: {
				Inputs: [makeInput('IN0', 'SRC 0')],
				Outputs: []
			}
		});

		const sections = groupSruSignals([asrc0]);

		expect(sections.map(section => section.kind)).to.deep.equal([
			'peripherals'
		]);
	});

	it('wraps an ungrouped peripheral with only SRU subgroups (no fallback) under its own name', () => {
		const asrc0 = makePeripheral({
			name: 'ASRC0',
			sru: {
				Inputs: [
					makeInput('IN0', 'SRC 0'),
					makeInput('IN1', 'SRC 1')
				],
				Outputs: []
			}
		});

		const [{entries}] = groupSruSignals([asrc0]);
		const [group] = entries;

		expect(group.group).to.equal('ASRC0');
		expect(
			group.signalGroups.map(signalGroup => signalGroup.name)
		).to.deep.equal(['SRC 0', 'SRC 1']);
	});

	it('keeps identically-named signal groups on different peripherals as separate entries', () => {
		const asrc0 = makePeripheral({
			name: 'ASRC0',
			group: 'ASRC',
			sru: {
				Inputs: [makeInput('ASRC0_IN', 'SRC 0')],
				Outputs: []
			}
		});
		const asrc1 = makePeripheral({
			name: 'ASRC1',
			group: 'ASRC',
			sru: {
				Inputs: [
					makeInput('ASRC1_IN_A', 'SRC 0'),
					makeInput('ASRC1_IN_B', 'SRC 0')
				],
				Outputs: []
			}
		});

		const [{entries}] = groupSruSignals([asrc0, asrc1]);
		const [group] = entries;
		const srcSignalGroups = group.signalGroups.filter(
			signalGroup => signalGroup.name === 'SRC 0'
		);

		expect(srcSignalGroups).to.have.length(2);
		expect(srcSignalGroups[0].inputs).to.have.length(1);
		expect(srcSignalGroups[0].peripheralName).to.equal('ASRC0');
		expect(srcSignalGroups[1].inputs).to.have.length(2);
		expect(srcSignalGroups[1].peripheralName).to.equal('ASRC1');
	});

	it('produces no sections for a peripheral with no sru data at all', () => {
		const noSru = makePeripheral({name: 'NO_SRU'});

		expect(groupSruSignals([noSru])).to.deep.equal([]);
	});

	it('orders top-level entries alphabetically by their display label, regardless of whether they are a real group, a wrapped peripheral, or a flat entry', () => {
		const asrc0 = makePeripheral({
			name: 'ASRC0',
			sru: {
				Inputs: [makeInput('ASRC0_IN', 'SRC 0')],
				Outputs: []
			}
		});
		const sport0 = makePeripheral({
			name: 'SPORT0',
			group: 'SPORT',
			sru: {
				Inputs: [makeInput('SPT0A_CLK_I', 'SPORT 0A')],
				Outputs: []
			}
		});
		const timer0 = makePeripheral({
			name: 'TIMER0',
			sru: {
				Inputs: [makeInput('TIMER0_IN')],
				Outputs: []
			}
		});
		const pdm0 = makePeripheral({
			name: 'PDM0',
			group: 'PDM',
			sru: {
				Inputs: [makeInput('PDM0_CLK_I', 'PDM 0')],
				Outputs: []
			}
		});

		const [{entries}] = groupSruSignals([
			asrc0,
			sport0,
			timer0,
			pdm0
		]);

		expect(
			entries.map(entry => entry.group ?? entry.signalGroups[0]?.name)
		).to.deep.equal(['ASRC0', 'PDM', 'SPORT', 'TIMER0']);
	});

	it('orders signal groups within an entry alphabetically, regardless of their data-model first-occurrence order', () => {
		// Mirrors PCG0 on adsp-sc835w-bga_ed: register layout groups
		// channels as A, B, E, F, G, C, D, H, not alphabetically.
		const pcg0 = makePeripheral({
			name: 'PCG0',
			sru: {
				Inputs: [
					makeInput('PCG0_EXTCLKA_I', 'PCG A'),
					makeInput('PCG0_EXTCLKB_I', 'PCG B'),
					makeInput('PCG0_SYNC_CLKE_I', 'PCG E'),
					makeInput('PCG0_SYNC_CLKF_I', 'PCG F'),
					makeInput('PCG0_HWG_TRIG_I', 'PCG G'),
					makeInput('PCG0_EXTCLKC_I', 'PCG C'),
					makeInput('PCG0_EXTCLKD_I', 'PCG D'),
					makeInput('PCG0_SYNC_CLKH_I', 'PCG H')
				],
				Outputs: []
			}
		});

		const [{entries}] = groupSruSignals([pcg0]);
		const [group] = entries;

		expect(
			group.signalGroups.map(signalGroup => signalGroup.name)
		).to.deep.equal([
			'PCG A',
			'PCG B',
			'PCG C',
			'PCG D',
			'PCG E',
			'PCG F',
			'PCG G',
			'PCG H'
		]);
	});

	it('orders pin-buffer signal groups by their stripped display label, not their raw name', () => {
		const dai0 = makePeripheral({
			name: 'DAI0',
			sru: {
				Inputs: [
					makeInput('DAI0_PB02_I', 'DAI0_PB02'),
					makeInput('DAI0_PBEN02_I', 'DAI0_PB02', {
						IsPinBufferEnable: true
					}),
					makeInput('DAI0_PB01_I', 'DAI0_PB01'),
					makeInput('DAI0_PBEN01_I', 'DAI0_PB01', {
						IsPinBufferEnable: true
					}),
					makeInput('DAI0_PB10_I', 'DAI0_PB10'),
					makeInput('DAI0_PBEN10_I', 'DAI0_PB10', {
						IsPinBufferEnable: true
					})
				],
				Outputs: []
			}
		});

		const [pinBuffers] = groupSruSignals([dai0]);

		expect(
			pinBuffers.entries[0].signalGroups.map(
				signalGroup => signalGroup.label
			)
		).to.deep.equal(['PB01', 'PB02', 'PB10']);
	});
});
