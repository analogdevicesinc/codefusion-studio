/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import GeneratedFiles from './GeneratedFiles';
import {formatGeneratedFilePaths} from '../../../utils/api';
import {runCodeGeneration} from '../../../state/slices/app-context/appContext.reducer';
import {configurePreloadedStore} from '../../../state/store';
import type {CfsConfig} from 'cfs-types';
import type {Soc} from '@common/types/soc';

const max32690Wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

// Mock config dictionary based on the max32690-wlp-dual-core-blinky.cfsconfig file
const mockConfigDict = {
	Soc: 'MAX32690',
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Projects: [
		{
			CoreId: 'CM4',
			ProjectId: 'CM4',
			PluginId: 'com.analog.project.zephyr40.plugin',
			PluginVersion: '1.0.0',
			FirmwarePlatform: 'zephyr-4.0',
			ExternallyManaged: false,
			Description: 'ARM Cortex-M4 Core',
			CoreNum: 0,
			IsPrimary: true,
			Name: 'Cortex-M4',
			PlatformConfig: {
				ProjectName: 'm4',
				ZephyrBoardName: 'apard32690/max32690/m4'
			}
		},
		{
			CoreId: 'RV',
			ProjectId: 'RV',
			PluginId: 'com.analog.project.msdk.plugin',
			PluginVersion: '1.1.0',
			FirmwarePlatform: 'msdk',
			ExternallyManaged: false,
			Description: 'RISC-V Core',
			CoreNum: 1,
			IsPrimary: false,
			Name: 'RISC-V',
			PlatformConfig: {
				ProjectName: 'riscv'
			}
		}
	]
} as unknown as CfsConfig;

describe('GeneratedFiles component', () => {
	it('should format and display generated file paths correctly', () => {
		const reduxStore = configurePreloadedStore(
			max32690Wlp,
			mockConfigDict
		);

		// Payload already formatted by `createCodeGenerationPromise`, as
		// `codeGenState.files` stores post-formatting paths.
		const mockGeneratedFiles = [
			'm4/src/main.c',
			'm4/config/pinmux.c',
			'm4/zephyr/led_control.c',
			'riscv/src/app.c',
			'riscv/include/uart_config.h',
			'/tmp/unknown/path/file.c'
		];

		cy.mount(<GeneratedFiles />, reduxStore).then(() => {
			reduxStore.dispatch({
				type: runCodeGeneration.fulfilled.type,
				payload: mockGeneratedFiles
			});

			cy.dataTest('generated-files:list-container').should('exist');

			cy.dataTest('generated-files:list-container')
				.children()
				.should('have.length', 6);

			cy.contains('m4/src/main.c').should('exist');
			cy.contains('m4/config/pinmux.c').should('exist');
			cy.contains('m4/zephyr/led_control.c').should('exist');
			cy.contains('riscv/src/app.c').should('exist');
			cy.contains('riscv/include/uart_config.h').should('exist');
			cy.contains('/tmp/unknown/path/file.c').should('exist');
		});
	});

	it('should display error message when generation fails', () => {
		const reduxStore = configurePreloadedStore(
			max32690Wlp,
			mockConfigDict
		);

		cy.mount(<GeneratedFiles />, reduxStore).then(() => {
			reduxStore.dispatch({
				type: runCodeGeneration.rejected.type,
				payload:
					'An error occurred while generating the code files, please try again.'
			});

			cy.contains(
				'An error occurred while generating the code files, please try again.'
			).should('exist');
		});
	});

	it('should display empty list when generated files array is empty', () => {
		const reduxStore = configurePreloadedStore(
			max32690Wlp,
			mockConfigDict
		);

		cy.mount(<GeneratedFiles />, reduxStore).then(() => {
			reduxStore.dispatch({
				type: runCodeGeneration.fulfilled.type,
				payload: []
			});

			cy.dataTest('generated-files:list-container')
				.children()
				.should('have.length', 0);
		});
	});

	// Unit test for the formatGeneratedFilePaths utility function
	it('should format file paths correctly based on project names', () => {
		// Test cases for the formatGeneratedFilePaths function
		const testCases = [
			{
				description: 'should handle paths containing project names',
				files: [
					'/home/user/projects/m4/src/main.c',
					'/home/user/projects/riscv/app.c'
				],
				projectNames: ['m4', 'riscv'],
				expected: ['m4/src/main.c', 'riscv/app.c']
			},
			{
				description:
					'should preserve full paths when no project name matches',
				files: ['/tmp/unknown/file.c'],
				projectNames: ['m4', 'riscv'],
				expected: ['/tmp/unknown/file.c']
			},
			{
				description: 'should handle empty files array',
				files: [],
				projectNames: ['m4', 'riscv'],
				expected: []
			},
			{
				description: 'should handle empty project names array',
				files: ['/home/user/projects/m4/src/main.c'],
				projectNames: [],
				expected: ['/home/user/projects/m4/src/main.c']
			},
			{
				description:
					'should handle project name appearing multiple times in path',
				files: ['/home/m4/projects/m4/src/main.c'],
				projectNames: ['m4'],
				expected: ['m4/projects/m4/src/main.c']
			},
			{
				description:
					'should handle Windows-style paths with backslash separators',
				files: [
					'C:\\Users\\user\\projects\\m4\\src\\main.c',
					'C:\\Users\\user\\projects\\riscv\\app.c'
				],
				projectNames: ['m4', 'riscv'],
				expected: ['m4/src/main.c', 'riscv/app.c']
			}
		];

		// Run each test case
		testCases.forEach(
			({description, files, projectNames, expected}) => {
				const result = formatGeneratedFilePaths(files, projectNames);
				expect(result).to.deep.equal(expected, description);
			}
		);
	});
});
