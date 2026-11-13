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

import {expect} from 'chai';
import {
	getZooModelPlatform,
	resolveZooModelUrl
} from './model-zoo-utils';
import type {
	ModelData,
	ModelSupportedPlatform
} from '../../types/model-zoo-data';

function makePlatform(
	overrides: Partial<ModelSupportedPlatform> & {
		soc: string;
		board: string;
		core: string;
		modelPaths: Record<string, string>;
	}
): ModelSupportedPlatform {
	return overrides as ModelSupportedPlatform;
}

function makeModel(platforms: ModelSupportedPlatform[]): ModelData {
	return {
		uniqueId: 'test-model',
		name: 'Test Model',
		description: '',
		task: '',
		taskType: '',
		framework: 'tensorflow',
		license: 'Apache-2.0',
		supportedPlatforms: platforms,
		baseURL: 'https://zoo.example.com'
	};
}

const BOARD_A_PLATFORM = makePlatform({
	soc: 'ADSP-SC835',
	board: 'BOARD-A',
	family: 'SHARC-FX',
	core: 'FX',
	modelPaths: {int8: 'models/board_a_int8.tflite'},
	sample_binary: {int8: 'samples/board_a_int8.bin'}
});

const BOARD_B_PLATFORM = makePlatform({
	soc: 'ADSP-SC835',
	board: 'BOARD-B',
	family: 'SHARC-FX',
	core: 'FX',
	modelPaths: {int8: 'models/board_b_int8.tflite'},
	sample_binary: {int8: 'samples/board_b_int8.bin'}
});

describe('getZooModelPlatform', () => {
	it('returns the exact board match', () => {
		const model = makeModel([BOARD_A_PLATFORM, BOARD_B_PLATFORM]);
		const result = getZooModelPlatform({
			selectedZooModel: model,
			soc: 'ADSP-SC835',
			board: 'BOARD-B',
			core: 'FX'
		});
		expect(result).to.equal(BOARD_B_PLATFORM);
	});

	it('prefers exact board over earlier family match', () => {
		const model = makeModel([BOARD_A_PLATFORM, BOARD_B_PLATFORM]);
		const result = getZooModelPlatform({
			selectedZooModel: model,
			soc: 'ADSP-SC835',
			board: 'BOARD-B',
			core: 'FX',
			family: 'SHARC-FX'
		});
		expect(result).to.equal(BOARD_B_PLATFORM);
	});

	it('falls back to family when board does not match any platform', () => {
		const model = makeModel([BOARD_A_PLATFORM, BOARD_B_PLATFORM]);
		const result = getZooModelPlatform({
			selectedZooModel: model,
			soc: 'ADSP-SC835',
			board: 'UNKNOWN-BOARD',
			core: 'FX',
			family: 'SHARC-FX'
		});
		expect(result).to.equal(BOARD_A_PLATFORM);
	});

	it('returns undefined when neither board nor family matches', () => {
		const model = makeModel([BOARD_A_PLATFORM]);
		const result = getZooModelPlatform({
			selectedZooModel: model,
			soc: 'ADSP-SC835',
			board: 'UNKNOWN-BOARD',
			core: 'FX',
			family: 'Cortex-M'
		});
		expect(result).to.equal(undefined);
	});

	it('does not use family fallback when accelerator is specified', () => {
		const model = makeModel([BOARD_A_PLATFORM]);
		const result = getZooModelPlatform({
			selectedZooModel: model,
			soc: 'ADSP-SC835',
			board: 'UNKNOWN-BOARD',
			core: 'FX',
			accelerator: 'NPU',
			family: 'SHARC-FX'
		});
		expect(result).to.equal(undefined);
	});
});

describe('resolveZooModelUrl', () => {
	it('resolves URLs from exact board match when core is provided', () => {
		const model = makeModel([BOARD_A_PLATFORM, BOARD_B_PLATFORM]);
		const selection = {model, quantization: 'int8'};
		const result = resolveZooModelUrl(
			selection,
			'ADSP-SC835',
			'BOARD-B',
			'FX',
			undefined,
			'SHARC-FX'
		);
		expect(result.modelUrl).to.equal(
			'https://zoo.example.com/models/board_b_int8.tflite'
		);
		expect(result.datasetUrl).to.equal(
			'https://zoo.example.com/samples/board_b_int8.bin'
		);
	});

	it('resolves URLs from exact board match when core is omitted', () => {
		const model = makeModel([BOARD_A_PLATFORM, BOARD_B_PLATFORM]);
		const selection = {model, quantization: 'int8'};
		const result = resolveZooModelUrl(
			selection,
			'ADSP-SC835',
			'BOARD-B',
			undefined,
			undefined,
			'SHARC-FX'
		);
		expect(result.modelUrl).to.equal(
			'https://zoo.example.com/models/board_b_int8.tflite'
		);
	});

	it('falls back to family-compatible platform when board is unknown and core is omitted', () => {
		const model = makeModel([BOARD_A_PLATFORM, BOARD_B_PLATFORM]);
		const selection = {model, quantization: 'int8'};
		const result = resolveZooModelUrl(
			selection,
			'ADSP-SC835',
			'UNKNOWN-BOARD',
			undefined,
			undefined,
			'SHARC-FX'
		);
		expect(result.modelUrl).to.equal(
			'https://zoo.example.com/models/board_a_int8.tflite'
		);
		expect(result.datasetUrl).to.equal(
			'https://zoo.example.com/samples/board_a_int8.bin'
		);
	});

	it('returns undefined URLs when no platform matches', () => {
		const model = makeModel([BOARD_A_PLATFORM]);
		const selection = {model, quantization: 'int8'};
		const result = resolveZooModelUrl(
			selection,
			'ADSP-SC835',
			'UNKNOWN-BOARD'
		);
		expect(result.modelUrl).to.equal(undefined);
		expect(result.datasetUrl).to.equal(undefined);
	});
});
