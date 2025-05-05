import {store} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';
import {
	setCoreConfig,
	setCoreToConfigId,
	setSelectedBoardPackage,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import CoreConfigContainer from './CoreConfigContainer';

const mockedPlugins = [
	{
		pluginId: 'MAX32690_Baremetal.plugin',
		pluginName: 'mocked plugin',
		pluginPath: '',
		pluginDescription: '',
		pluginVersion: '',
		pluginApiVersion: 0,
		minConfigSchema: 0,
		maxConfigSchema: 0,
		author: '',
		supportedSocs: [
			{
				name: 'MAX32690',
				dataModel: '',
				board: '',
				package: 'wlp'
			}
		],
		firmwarePlatform: '',
		features: [],
		properties: {workspace: []},
		configOverrides: []
	}
];

const promise = new Promise<any[]>(resolve => {
	resolve(mockedPlugins);
});

function TestComponent() {
	return (
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			<div style={{flex: 1}}>
				<CoreConfigContainer pluginsPromise={promise} />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

const zephyrPluginCardId =
	'coreConfig:card:MAX32690_Baremetal.plugin';

describe('Core Configuration Screen', () => {
	beforeEach(() => {
		cy.viewport(820, 600);
	});

	it('Should show NotificationError based on validation rules', () => {
		localStorage.setItem('plugins', JSON.stringify(mockedPlugins));

		cy.wait(1000);

		cy.log(localStorage.getItem('plugins') ?? 'no plugins found');

		const testStore = {...store};
		testStore.dispatch(setActiveScreen(navigationItems.coreConfig));
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setSelectedBoardPackage({boardId: '', packageId: 'wlp'})
		);
		testStore.dispatch(setCoreToConfigId('CM4'));

		testStore.dispatch(
			setCoreConfig({
				id: 'CM4',
				config: {
					firmwarePlatform: '',
					pluginId: '',
					pluginVersion: '1.0.0',
					platformConfig: {}
				}
			})
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.wait(1000);
			// Check if the error is displayed when trying to apply a config without selecting the plugin
			cy.dataTest('wrksp-footer:continue-btn').click();
			cy.dataTest('core-config:notification-error').should('exist');

			cy.dataTest(
				'core-config:notification-error--noCoreConfig'
			).should(
				'contain.text',
				'Please provide a value for all required fields.'
			);

			// Selecting a plugin should hide the NotificationError and display the Template Settings
			cy.dataTest(`${zephyrPluginCardId}`).should(
				'have.attr',
				'data-active',
				'false'
			);

			cy.dataTest(`${zephyrPluginCardId}`)
				.click()
				.then(() => {
					cy.dataTest('core-config:notification-error').should(
						'not.exist'
					);
				});
		});
	});
});
