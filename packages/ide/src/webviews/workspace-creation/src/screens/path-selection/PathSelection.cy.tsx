/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import {navigationItems} from '../../common/constants/navigation';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {store} from '../../state/store';
import PathSelectionScreen from './PathSelection';

describe('Path Selection', () => {
	it.skip('Should display an error if the required fields are not populated and the user attempts to create a workspace', () => {
		cy.viewport(800, 600);

		const reduxStore = {...store};

		reduxStore.dispatch(
			setActiveScreen(navigationItems.pathSelection)
		);

		cy.mount(
			<div
				style={{
					height: '100vh',
					display: 'flex',
					flexDirection: 'column'
				}}
			>
				<div
					style={{
						height: '100%',
						flexGrow: 1,
						display: 'flex',
						alignItems: 'center'
					}}
				>
					<PathSelectionScreen />
				</div>
				<div style={{flexShrink: 1}}>
					<WrkspFooter />
				</div>
			</div>,
			reduxStore
		).then(() => {
			cy.log('No errors should display on first mount');

			cy.dataTest(
				'confirmation-screen:workspace-name:input-error'
			).should('not.exist');

			cy.dataTest(
				'confirmation-screen:workspace-path:default-location-checkbox'
			).click();

			cy.dataTest(
				'confirmation-screen:workspace-path:text-field-control-input'
			)
				.shadow()
				.find('input')
				.focus()
				.clear();

			cy.wait(500);

			cy.dataTest(
				'confirmation-screen:workspace-path:text-field-error'
			).should('not.exist');

			cy.dataTest('wrksp-footer:continue-btn').realClick();

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-error'
			).should('exist');

			cy.dataTest(
				'confirmation-screen:workspace-path:text-field-error'
			).should('exist');

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-control-input'
			)
				.shadow()
				.find('input')
				.focus();

			cy.focused().type('Test Workspace Name');

			cy.wait(500);

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-error'
			).should('exist');

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-control-input'
			)
				.shadow()
				.find('input')
				.clear();

			cy.log(
				'Populating the fields with valid data should remove the error messages'
			);

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-control-input'
			)
				.shadow()
				.find('input')
				.focus();

			cy.focused().type('Test_Workspace');

			cy.wait(500);

			cy.dataTest(
				'confirmation-screen:workspace-path:text-field-control-input'
			)
				.shadow()
				.find('input')
				.focus();

			cy.focused().type('test/workspace/path');

			cy.wait(500);

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-error'
			).should('not.exist');

			cy.dataTest(
				'confirmation-screen:workspace-path:text-field-error'
			).should('not.exist');

			cy.log(
				'Attempting to create a new workspace should not generate new error messages'
			);

			cy.dataTest('wrksp-footer:continue-btn').realClick();

			cy.dataTest(
				'confirmation-screen:workspace-name:text-field-error'
			).should('not.exist');

			cy.dataTest(
				'confirmation-screen:workspace-path:text-field-error'
			).should('not.exist');
		});
	});
});
