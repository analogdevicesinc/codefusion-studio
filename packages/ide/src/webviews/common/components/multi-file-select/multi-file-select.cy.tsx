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

import {setupMessengerMock} from '@common/test-utils/messenger-mock';
import MultiFileSelect, {
	type MultiFileSelectItem
} from './multi-file-select';

let selectFileResult: string | undefined;

function mountWithState(initialFiles: MultiFileSelectItem[] = []) {
	const onFilesChange = cy.stub().as('onFilesChange');

	cy.mount(
		<MultiFileSelect
			dataTest='test-multi-file'
			files={initialFiles}
			title='Test files'
			onFilesChange={onFilesChange}
		/>
	);

	return onFilesChange;
}

describe('MultiFileSelect', {defaultCommandTimeout: 30000}, () => {
	before(() => {
		setupMessengerMock({
			selectFile: () => selectFileResult
		});
	});

	beforeEach(() => {
		selectFileResult = undefined;
	});

	it('should not add a duplicate when the same path is selected with different separators', () => {
		const existingFiles: MultiFileSelectItem[] = [
			{path: 'C:\\Users\\dev\\project\\file.c'}
		];

		selectFileResult = 'C:/Users/dev/project/file.c';

		mountWithState(existingFiles);

		cy.dataTest('test-multi-file-browse').click();

		cy.get('@onFilesChange').should('not.have.been.called');
	});

	it('should not add a duplicate when backslash path is selected and forward-slash already exists', () => {
		const existingFiles: MultiFileSelectItem[] = [
			{path: 'C:/Users/dev/project/file.c'}
		];

		selectFileResult = 'C:\\Users\\dev\\project\\file.c';

		mountWithState(existingFiles);

		cy.dataTest('test-multi-file-browse').click();

		cy.get('@onFilesChange').should('not.have.been.called');
	});

	it('should add a file when the path is genuinely different', () => {
		const existingFiles: MultiFileSelectItem[] = [
			{path: 'C:\\Users\\dev\\project\\file.c'}
		];

		selectFileResult = 'C:/Users/dev/project/other.c';

		mountWithState(existingFiles);

		cy.dataTest('test-multi-file-browse').click();

		cy.get('@onFilesChange').should('have.been.calledOnce');
		cy.get('@onFilesChange').should(stub => {
			const newFiles = (stub as unknown as sinon.SinonStub).firstCall
				.args[0] as MultiFileSelectItem[];
			assert.strictEqual(newFiles.length, 2);
			assert.strictEqual(
				newFiles[1].path,
				'C:/Users/dev/project/other.c'
			);
		});
	});
});
