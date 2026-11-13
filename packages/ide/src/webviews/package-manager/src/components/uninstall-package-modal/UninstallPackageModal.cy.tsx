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

import UninstallPackageModal from './UninstallPackageModal';
import {resetStore, store} from '../../state/store';
import {mockPackageManager} from '../../test-utils/package-manager-mock';
import {mountPackageManagerComponent} from '../../test-utils/mount';

const target = [{name: 'test_pkg1', version: '2.0.0'}];

describe('UninstallPackageModal', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore());
		mockPackageManager();
	});

	it('names the package being removed when nothing depends on it', () => {
		mountPackageManagerComponent(
			<UninstallPackageModal
				isOpen
				packages={target}
				dependents={[]}
				onClose={cy.stub().as('close')}
				onConfirm={cy.stub().as('confirm')}
			/>
		);

		cy.contains('Uninstall package?').should('be.visible');
		cy.dataTest('uninstall-dependents').should('not.exist');
		cy.dataTest('uninstall-confirm').click();

		cy.get('@confirm').should('have.been.calledOnce');
	});

	it('lists the installed packages that will be removed alongside it', () => {
		mountPackageManagerComponent(
			<UninstallPackageModal
				isOpen
				packages={target}
				dependents={[
					{name: 'test_pkg_consumer1', version: '1.2.0'},
					{name: 'test_pkg_consumer2', version: '3.1.0'}
				]}
				onClose={cy.stub().as('close')}
				onConfirm={cy.stub().as('confirm')}
			/>
		);

		// Uninstalling a dependency takes its dependents with it, so every
		// package about to disappear has to be named before the user agrees.
		cy.dataTest('uninstall-dependents').should('be.visible');
		cy.dataTest('uninstall-dependent-test_pkg_consumer1')
			.should('contain.text', 'test_pkg_consumer1')
			.and('contain.text', 'v1.2.0');
		cy.dataTest('uninstall-dependent-test_pkg_consumer2')
			.should('contain.text', 'test_pkg_consumer2')
			.and('contain.text', 'v3.1.0');

		// Three packages go: the selected one plus its two dependents.
		cy.contains('3 packages will be uninstalled').should(
			'be.visible'
		);
	});

	it('offers the opt-out only when the removal is a single package', () => {
		mountPackageManagerComponent(
			<UninstallPackageModal
				isOpen
				packages={target}
				dependents={[{name: 'test_pkg_consumer1', version: '1.2.0'}]}
				onClose={cy.stub().as('close')}
				onConfirm={cy.stub().as('confirm')}
			/>
		);

		// A cascading removal is not a decision to suppress in future.
		cy.dataTest('uninstall-dont-show-again').should('not.exist');
	});

	it('closes without uninstalling when cancelled', () => {
		mountPackageManagerComponent(
			<UninstallPackageModal
				isOpen
				packages={target}
				dependents={[]}
				onClose={cy.stub().as('close')}
				onConfirm={cy.stub().as('confirm')}
			/>
		);

		cy.dataTest('uninstall-cancel').click();

		cy.get('@close').should('have.been.calledOnce');
		cy.get('@confirm').should('not.have.been.called');
	});
});
