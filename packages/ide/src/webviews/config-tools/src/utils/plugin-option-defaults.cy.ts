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

import type {ControlCfg} from '../../../common/types/soc';
import {getTypeBasedDefault} from './control-defaults';
import {getAllPluginOptions} from './plugin-options';

function makeControl(overrides: Partial<ControlCfg>): ControlCfg {
	const control: ControlCfg = {
		Id: 'CTRL',
		Description: 'Test control',
		Type: 'text',
		...overrides
	};

	return control;
}

describe('getTypeBasedDefault', () => {
	it('returns the first EnumValues Id for an enum control', () => {
		const control = makeControl({
			Type: 'enum',
			EnumValues: [
				{Id: 'FISH', Description: 'Fish', Value: 0},
				{Id: 'FOWL', Description: 'Fowl', Value: 1}
			]
		});

		expect(getTypeBasedDefault(control)).to.equal('FISH');
	});

	it('returns empty string for an enum control with no EnumValues', () => {
		const control = makeControl({Type: 'enum', EnumValues: []});

		expect(getTypeBasedDefault(control)).to.equal('');
	});

	it('returns "0" for a decimal integer control', () => {
		const control = makeControl({Type: 'integer'});

		expect(getTypeBasedDefault(control)).to.equal('0');
	});

	it('returns "0" for a hexadecimal integer control', () => {
		const control = makeControl({
			Type: 'integer',
			NumericBase: 'Hexadecimal'
		});

		expect(getTypeBasedDefault(control)).to.equal('0');
	});

	it('returns empty string for a text control', () => {
		const control = makeControl({Type: 'text'});

		expect(getTypeBasedDefault(control)).to.equal('');
	});

	it('returns "FALSE" for a boolean control', () => {
		const control = makeControl({Type: 'boolean'});

		expect(getTypeBasedDefault(control)).to.equal('FALSE');
	});
});

describe('getAllPluginOptions', () => {
	const projectId = 'RV';
	const project = {projectId} as any;

	function run(
		controls: ControlCfg[],
		existingConfig: Record<string, any> = {}
	) {
		return getAllPluginOptions(
			{[projectId]: existingConfig},
			{[projectId]: {memory: controls}},
			[project]
		);
	}

	it('assigns first enum option when control has no Hint and no existing value', () => {
		const control = makeControl({
			Id: 'MYENUM',
			Type: 'enum',
			EnumValues: [
				{Id: 'FISH', Description: 'Fish', Value: 0},
				{Id: 'FOWL', Description: 'Fowl', Value: 1}
			]
		});

		const result = run([control]);

		expect(result[projectId].MYENUM).to.equal('FISH');
	});

	it('assigns "0" for an integer control with no Hint and no existing value', () => {
		const control = makeControl({Id: 'MYINT', Type: 'integer'});

		const result = run([control]);

		expect(result[projectId].MYINT).to.equal('0');
	});

	it('assigns "0" for a hex integer control with no Hint and no existing value', () => {
		const control = makeControl({
			Id: 'MYHEX',
			Type: 'integer',
			NumericBase: 'Hexadecimal'
		});

		const result = run([control]);

		expect(result[projectId].MYHEX).to.equal('0');
	});

	it('assigns empty string for a text control with no Hint and no existing value', () => {
		const control = makeControl({Id: 'MYTEXT', Type: 'text'});

		const result = run([control]);

		expect(result[projectId].MYTEXT).to.equal('');
	});

	it('uses Hint value when Hint is defined, regardless of type', () => {
		const control = makeControl({
			Id: 'MYINT',
			Type: 'integer',
			Hint: '42'
		});

		const result = run([control]);

		expect(result[projectId].MYINT).to.equal('42');
	});

	it('does not overwrite an existing value in the config', () => {
		const control = makeControl({
			Id: 'MYENUM',
			Type: 'enum',
			EnumValues: [
				{Id: 'FISH', Description: 'Fish', Value: 0},
				{Id: 'FOWL', Description: 'Fowl', Value: 1}
			]
		});

		const result = run([control], {MYENUM: 'FOWL'});

		expect(result[projectId].MYENUM).to.equal('FOWL');
	});

	it('assigns false for a boolean control with no Hint and no existing value', () => {
		const control = makeControl({Id: 'MYBOOL', Type: 'boolean'});

		const result = run([control]);

		expect(result[projectId].MYBOOL).to.equal(false);
	});
});
