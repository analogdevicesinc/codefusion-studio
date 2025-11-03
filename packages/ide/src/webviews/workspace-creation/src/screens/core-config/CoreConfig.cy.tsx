import {store} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';
import {
	setCoreConfig,
	setCoresInitialState,
	setCoreToConfigId,
	setSelectedBoardPackage,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import CoreConfig from './CoreConfig';

const mockedPlugins = [
	{
		pluginId: 'MAX32690_zephyr.plugin',
		pluginName: 'MAX32690_zephyr.plugin',
		pluginPath: '',
		pluginDescription: '',
		pluginVersion: '1.0.0',
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
		firmwarePlatform: 'zephyr',
		features: [],
		properties: {
			project: [
				{
					category: 'Project Settings',
					default: 'CM4',
					id: 'ProjectName',
					name: 'Project Name',
					readonly: false,
					required: true,
					type: 'string'
				},
				{
					category: 'Build Settings',
					default: 'ninja',
					enum: [],
					id: 'BuildSystem',
					name: 'Build System',
					placeholder: '',
					required: true,
					type: 'array'
				},
				{
					default: 'max32690evkit/max32690/m4',
					id: 'ZephyrBoardName',
					name: 'Zephyr Board Name',
					placeholder: '',
					required: true,
					type: 'string'
				},
				{
					default:
						'# Build for debug (no optimizations) by default\nCONFIG_DEBUG=y\nCONFIG_NO_OPTIMIZATIONS=y\n\n# Enable thread awareness when debugging\nCONFIG_THREAD_NAME=y\nCONFIG_DEBUG_THREAD_INFO=y\nCONFIG_THREAD_ANALYZER=y\n',
					id: 'KConfigFlags',
					name: 'Zephyr KConfig Flags',
					placeholder: '',
					required: false,
					type: 'textarea'
				},
				{
					default:
						'# Include compiler flags to enable source navigation with ELF File Explorer\nzephyr_cc_option(-fstack-usage)\nzephyr_cc_option(-fdump-ipa-cgraph)\nzephyr_cc_option(-gdwarf-4)\n',
					id: 'CMakeArgs',
					name: 'Zephyr Additional CMake Arguments',
					placeholder: '',
					required: false,
					type: 'textarea'
				}
			]
		},
		configOverrides: []
	},
	{
		pluginId: 'MAX32690_Baremetal.plugin',
		pluginName: 'MAX32690_Baremetal.plugin',
		pluginPath: '',
		pluginDescription: '',
		pluginVersion: '1.0.0',
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
		firmwarePlatform: 'baremetal',
		features: [],
		properties: {project: []},
		configOverrides: []
	}
];

const mockedPluginProperties = [
	{
		id: 'ProjectName',
		name: 'Project Name',
		category: 'Project Settings',
		default: '',
		type: 'string',
		required: true,
		readonly: false
	},
	{
		id: 'BuildSystem',
		name: 'Build System',
		category: 'Build Settings',
		default: 'ninja',
		placeholder: '',
		type: 'array',
		enum: [
			{
				value: 'ninja',
				label: 'Ninja'
			},
			{
				value: 'make',
				label: 'Make'
			}
		],
		required: true
	},
	{
		id: 'ZephyrBoardName',
		name: 'Zephyr Board Name',
		default: '',
		placeholder: '',
		type: 'string',
		required: true
	},
	{
		id: 'KConfigFlags',
		name: 'Zephyr KConfig Flags',
		default:
			'# Build for debug (no optimizations) by default\nCONFIG_DEBUG=y\nCONFIG_NO_OPTIMIZATIONS=y\n\n# Enable thread awareness when debugging\nCONFIG_THREAD_NAME=y\nCONFIG_DEBUG_THREAD_INFO=y\nCONFIG_THREAD_ANALYZER=y\n',
		placeholder: '',
		type: 'textarea',
		required: false
	},
	{
		id: 'EnableCoreDump',
		name: 'Enable Core Dump',
		default: 'true',
		type: 'boolean',
		required: false,
		condition: ''
	},
	{
		id: 'CMakeArgs',
		name: 'Zephyr Additional CMake Arguments',
		default:
			'# Include compiler flags to enable source navigation with ELF File Explorer\nzephyr_cc_option(-fstack-usage)\nzephyr_cc_option(-fdump-ipa-cgraph)\nzephyr_cc_option(-gdwarf-4)\n',
		placeholder: '',
		type: 'textarea',
		required: false
	}
];

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
				<CoreConfig />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

const zephyrPluginCardId = 'coreConfig:card:MAX32690_zephyr.plugin';

describe('Core Configuration Screen', () => {
	beforeEach(() => {
		cy.viewport(820, 600);
		localStorage.setItem('plugins', JSON.stringify(mockedPlugins));
		localStorage.setItem(
			'pluginsProperties',
			JSON.stringify(mockedPluginProperties)
		);
	});

	it('Should show field error based on validation rules', () => {
		const testStore = {...store};
		testStore.dispatch(setActiveScreen(navigationItems.coreConfig));
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setSelectedBoardPackage({boardId: '', packageId: 'wlp'})
		);
		testStore.dispatch(setCoresInitialState(['CM4']));
		testStore.dispatch(setCoreToConfigId('CM4'));
		testStore.dispatch(
			setCoreConfig({
				id: 'CM4',
				config: {
					pluginId: mockedPlugins[0].pluginId,
					pluginVersion: mockedPlugins[0].pluginVersion,
					firmwarePlatform: mockedPlugins[0].firmwarePlatform,
					platformConfig: {
						ProjectName: 'CM4 with space',
						BuildSystem:
							mockedPlugins[0].properties.project[1].default,
						ZephyrBoardName:
							mockedPlugins[0].properties.project[2].default,
						KConfigFlags:
							mockedPlugins[0].properties.project[3].default,
						CMakeArgs: mockedPlugins[0].properties.project[4].default
					}
				}
			})
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.wait(1000);
			// Check if the main error notification is displayed
			cy.dataTest('wrksp-footer:continue-btn').click();
			cy.dataTest('core-config:notification-error').should('exist');

			cy.dataTest(
				'core-config:notification-error--noCoreConfig'
			).should(
				'contain.text',
				'Please provide a value for all required fields.'
			);

			// Check if the field error is displayed
			cy.dataTest(
				'core-config:dynamic-form:control-ProjectName-error'
			).should('exist');

			cy.dataTest(
				'core-config:dynamic-form:control-ProjectName-error'
			).should('contain.text', 'Project Name cannot contain spaces.');

			// Setting project name to a valid input
			cy.dataTest(
				'core-config:dynamic-form:control-ProjectName-control-input'
			)
				.shadow()
				.find('input')
				.clear()
				.type('ProjectnameWithoutSpace');

			// Assert error message is not shown anymore
			cy.get(
				'[data-test="core-config:dynamic-form:control-ProjectName-error"]'
			).should('not.exist');
		});
	});

	it('should show core info in the core config page', () => {
		const testStore = {...store};
		testStore.dispatch(setActiveScreen(navigationItems.coreConfig));
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setSelectedBoardPackage({boardId: '', packageId: 'wlp'})
		);
		testStore.dispatch(setCoresInitialState(['Arm Cortex-M4F']));
		testStore.dispatch(setCoreToConfigId('Arm Cortex-M4F'));
		testStore.dispatch(
			setCoreConfig({
				id: 'Arm Cortex-M4F',
				config: {
					pluginId: mockedPlugins[0].pluginId,
					pluginVersion: mockedPlugins[0].pluginVersion,
					firmwarePlatform: mockedPlugins[0].firmwarePlatform,
					platformConfig: {
						ProjectName:
							mockedPlugins[0].properties.project[0].default,
						BuildSystem:
							mockedPlugins[0].properties.project[1].default,
						ZephyrBoardName:
							mockedPlugins[0].properties.project[2].default,
						KConfigFlags:
							mockedPlugins[0].properties.project[3].default,
						CMakeArgs: mockedPlugins[0].properties.project[4].default
					}
				}
			})
		);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest('core-config:header:CM4').should('exist');
		});
	});

	it('Should show NotificationError based on validation rules', () => {
		cy.log(localStorage.getItem('plugins') ?? 'no plugins found');
		cy.log(
			localStorage.getItem('pluginsProperties') ??
				'no plugin properties found'
		);

		const testStore = {...store};
		testStore.dispatch(setActiveScreen(navigationItems.coreConfig));
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setSelectedBoardPackage({boardId: '', packageId: 'wlp'})
		);
		testStore.dispatch(setCoresInitialState(['CM4']));
		testStore.dispatch(setCoreToConfigId('CM4'));

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

	it('Should show the controls by clicking on a plugin', () => {
		const testStore = {...store};
		testStore.dispatch(setActiveScreen(navigationItems.coreConfig));
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setSelectedBoardPackage({boardId: '', packageId: 'wlp'})
		);
		testStore.dispatch(setCoresInitialState(['Arm Cortex-M4F']));
		testStore.dispatch(setCoreToConfigId('Arm Cortex-M4F'));
		testStore.dispatch(
			setCoreConfig({
				id: 'Arm Cortex-M4F',
				config: {
					pluginId: mockedPlugins[0].pluginId,
					pluginVersion: mockedPlugins[0].pluginVersion,
					firmwarePlatform: mockedPlugins[0].firmwarePlatform,
					platformConfig: {
						ProjectName:
							mockedPlugins[0].properties.project[0].default,
						BuildSystem:
							mockedPlugins[0].properties.project[1].default,
						ZephyrBoardName:
							mockedPlugins[0].properties.project[2].default,
						KConfigFlags:
							mockedPlugins[0].properties.project[3].default,
						CMakeArgs: mockedPlugins[0].properties.project[4].default
					}
				}
			})
		);

		cy.wait(1000);

		cy.mount(<TestComponent />, testStore).then(() => {
			cy.dataTest(
				'core-config:dynamic-form:control-ProjectName-control-input'
			).should('not.exist');
			cy.dataTest('coreConfig:card:MAX32690_zephyr.plugin').click();

			cy.dataTest(
				'core-config:dynamic-form:control-ProjectName-control-input'
			).should('exist');
			cy.dataTest(
				'core-config:dynamic-form:control-ZephyrBoardName-control-input'
			).should('exist');
			cy.dataTest(
				'core-config:dynamic-form:control-KConfigFlags'
			).should('exist');
		});
	});
});
