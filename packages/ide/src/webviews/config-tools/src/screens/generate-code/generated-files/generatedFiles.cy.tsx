/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

describe('GeneratedFiles component', () => {
	beforeEach(() => {
		// Mock config dictionary based on the max32690-wlp-dual-core-blinky.cfsconfig file
		const mockConfigDict = {
			Soc: 'MAX32690',
			BoardName: 'AD-APARD32690-SL',
			Package: 'WLP',
			projects: [
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
					PluginVersion: '1.0.0',
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
		};

		// Mock generated file paths that include the ProjectName from PlatformConfig
		const mockGeneratedFiles = [
			'/home/user/projects/m4/src/main.c',
			'/home/user/projects/m4/config/pinmux.c',
			'/home/user/projects/m4/zephyr/led_control.c',
			'/home/user/projects/riscv/src/app.c',
			'/home/user/projects/riscv/include/uart_config.h',
			'/tmp/unknown/path/file.c' // A path that doesn't match any project name
		];

		// Set localStorage mock values
		window.localStorage.setItem(
			'configDict',
			JSON.stringify(mockConfigDict)
		);
		window.localStorage.setItem(
			'generatedFiles',
			JSON.stringify(mockGeneratedFiles)
		);
	});

	it('should format and display generated file paths correctly', () => {
		// Create a promise that resolves to the mock file paths
		const mockPromise = Promise.resolve([
			'/home/user/projects/m4/src/main.c',
			'/home/user/projects/m4/config/pinmux.c',
			'/home/user/projects/m4/zephyr/led_control.c',
			'/home/user/projects/riscv/src/app.c',
			'/home/user/projects/riscv/include/uart_config.h',
			'/tmp/unknown/path/file.c'
		]);

		// Mount the component
		cy.mount(<GeneratedFiles promise={mockPromise} />);

		// Wait for the component to render
		cy.dataTest('generated-files:list-container').should('exist');

		// Verify the list contains the correct number of items
		cy.dataTest('generated-files:list-container')
			.children()
			.should('have.length', 6);

		// Verify the formatted paths are displayed correctly
		// Project paths should be shortened to include only the project name and subdirectories
		cy.contains('m4/src/main.c').should('exist');
		cy.contains('m4/config/pinmux.c').should('exist');
		cy.contains('m4/zephyr/led_control.c').should('exist');
		cy.contains('riscv/src/app.c').should('exist');
		cy.contains('riscv/include/uart_config.h').should('exist');

		// Paths that don't match any project name should be displayed in full
		cy.contains('/tmp/unknown/path/file.c').should('exist');
	});

	it('should display error message when generation fails', () => {
		// Create a promise that resolves to an error string
		const mockPromise = Promise.resolve(
			'An error occurred while generating the code files, please try again.'
		);

		// Mount the component
		cy.mount(<GeneratedFiles promise={mockPromise} />);

		// The component should display the error message
		cy.contains(
			'An error occurred while generating the code files, please try again.'
		).should('exist');
	});

	it('should display empty list when generated files array is empty', () => {
		// Create a promise that resolves to an empty array
		const mockPromise = Promise.resolve([]);

		// Mount the component
		cy.mount(<GeneratedFiles promise={mockPromise} />);

		// List should be empty
		cy.dataTest('generated-files:list-container')
			.children()
			.should('have.length', 0);
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
