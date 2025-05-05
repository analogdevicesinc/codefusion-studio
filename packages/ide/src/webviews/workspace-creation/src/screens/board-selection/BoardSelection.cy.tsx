import {store} from '../../state/store';
import {
	setSelectedBoardPackage,
	setSelectedSoc
} from '../../state/slices/workspace-config/workspace-config.reducer';
import BoardSelectionContainer from './BoardSelectionContainer';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';

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
				<BoardSelectionContainer />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

describe('BoardSelection', () => {
	beforeEach(() => {
		cy.viewport(1200, 600);
		cy.mount(<TestComponent />, store);
	});

	it('Should mount the BoardSelection component and display sections', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32655'));

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest('board-selection:container').should('exist');
			cy.contains('h2', 'Standard Boards and Packages').should(
				'exist'
			);
			cy.contains('h2', 'Custom Board Packages').should('exist');
		});
	});

	it('Should display card', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32655'));

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest(
				`boardSelection:card:AD-APARD32655-SL___WLP`
			).should('exist');
		});
	});

	it('Should display an SVG icon for one of the board and package items', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32655'));

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest(`boardSelection:card:AD-APARD32655-SL___WLP`)
				.find('svg')
				.should('exist');
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
			const cardTestId = 'boardSelection:card:EvKit_V1___TQFN';

			cy.dataTest(cardTestId).should('exist');
			cy.dataTest(cardTestId).should(
				'have.attr',
				'data-active',
				'true'
			);
		});
	});

	it('Should display an external link for board items', () => {
		cy.mount(<TestComponent />, store).then(() => {
			const cardTestId = 'boardSelection:card:EvKit_V1___TQFN';

			cy.dataTest(cardTestId).should('exist');

			cy.dataTest(cardTestId)
				.find('a[href]')
				.should('exist')
				.and('have.attr', 'href');
		});
	});
});
