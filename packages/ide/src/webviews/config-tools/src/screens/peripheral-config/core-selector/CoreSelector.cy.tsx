import {configureStore} from '@reduxjs/toolkit';
import {rootReducer} from '../../../state/store';
import CoreSelector from './CoreSelector';

const reduxStore = configureStore({reducer: rootReducer});
const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			Secure: false,
			ProjectId: 'CM4-proj',
			CoreId: 'CM4',
			PluginVersion: '1.0.0',
			PlatformConfig: {}
		},
		{
			CoreNum: 0,
			Description: 'Risc-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'RISC-V (RV32)',
			PluginId: '',
			Secure: false,
			ProjectId: 'RV-proj',
			CoreId: 'RV',
			PluginVersion: '1.0.0',
			PlatformConfig: {}
		}
	]
};

beforeEach(() => {
	window.localStorage.setItem(
		'configDict',
		JSON.stringify(mockedConfigDict)
	);
});

describe('Core selector', () => {
	it('should show available cores, chevrons and cancel button. Selecting a core or clicking cancel should trigger the correct action.', () => {
		const onSelect = cy.stub();
		const onCancel = cy.stub();
		const {projects} = mockedConfigDict;

		cy.mount(
			<CoreSelector
				projects={projects}
				isPeripheralSecure={false}
				onSelect={onSelect}
				onCancel={onCancel}
			/>,
			reduxStore
		);

		projects.forEach(project => {
			cy.dataTest(`core-${project.ProjectId}-container`)
				.should('exist')
				.click();
			cy.wrap(onSelect).should(
				'have.been.calledWith',
				project.ProjectId
			);
			cy.dataTest(`core-${project.ProjectId}-chevron`).should(
				'exist'
			);
		});

		cy.dataTest(`core-selector-cancel-btn`).should('exist').click();
		cy.wrap(onCancel).should('have.been.called');
	});
});
