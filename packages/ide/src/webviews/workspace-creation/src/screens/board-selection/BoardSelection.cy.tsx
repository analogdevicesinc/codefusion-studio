import {store} from '../../state/store';
import {
	setSelectedBoardPackage,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import BoardSelection from './BoardSelection';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';

const standardBoardsIds = [
	'boardSelection:card:AD-APARD32690-SL___WLP',
	'boardSelection:card:EvKit_V1___TQFN',
	'boardSelection:card:FTHR___'
];
const customBoardsIds = [
	'boardSelection:card:___MAX32690-tqfn',
	'boardSelection:card:___TQFN',
	'boardSelection:card:___WLP'
];

function TestComponent() {
	return (
		<div
			style={{
				width: '100%',
				height: '100vh',
				display: 'flex',
				flexDirection: 'column'
			}}
		>
			<div style={{flex: 1}}>
				<BoardSelection />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

describe('BoardSelection', () => {
	beforeEach(() => {
		cy.viewport(1200, 800);
		cy.mount(<TestComponent />, store);
	});

	it('Should mount the BoardSelection component and display sections and the correct SoC selection', () => {
		const testStore = {...store};
		const socId = 'MAX32655';
		testStore.dispatch(setSelectedSoc(socId));

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest('board-selection:container').should('exist');
			cy.contains('h2', 'Standard Boards and Packages').should(
				'exist'
			);
			cy.contains('h2', 'Custom Board Packages').should('exist');
			cy.dataTest('layout:mainPanel:board-selection').should(
				'contain.text',
				`Select one option for ${socId}.`
			);
		});
	});

	it('Should display CfsNotification when no item is selected and "Continue" is clicked', () => {
		const testStore = {...store};

		testStore.dispatch(
			setActiveScreen(navigationItems.boardSelection)
		);

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest('board-selection-error').should('not.exist');

			cy.dataTest('wrksp-footer:continue-btn').click();

			cy.dataTest('board-selection-error').should('exist');
			cy.dataTest('board-selection-error').should(
				'contain.text',
				'Please make a selection.'
			);
		});
	});

	it('Should correctly dispatch a board and package id and enable the correct selection card', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32690'));
		testStore.dispatch(
			setSelectedBoardPackage({
				boardId: 'EvKit_V1',
				packageId: 'TQFN'
			})
		);

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest(standardBoardsIds[1]).should('exist');
			cy.dataTest(standardBoardsIds[1]).should(
				'have.attr',
				'data-active',
				'true'
			);
		});
	});

	it('Should display an external link for standard boards, but not for custom boards', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(<TestComponent />, store).then(() => {
			standardBoardsIds.forEach(id => {
				cy.dataTest(id).should('exist');

				cy.dataTest(id)
					.find('a[href]')
					.should('exist')
					.and('have.attr', 'href');
			});

			customBoardsIds.forEach(id => {
				cy.dataTest(id).should('exist');
				cy.dataTest(id).find('a[href]').should('not.exist');
			});
		});
	});

	it('Should display the SVG icon for all boards', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32690'));

		cy.mount(<TestComponent />, store).then(() => {
			standardBoardsIds.concat(customBoardsIds).forEach(id => {
				cy.dataTest(id).find('svg').should('exist');
			});
		});
	});
});
