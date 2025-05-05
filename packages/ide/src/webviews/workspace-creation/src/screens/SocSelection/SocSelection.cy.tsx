import {store} from '../../state/store';
import SocSelectionContainer from './SocSelectionContainer';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '../../common/constants/navigation';
import WrkspFooter from '../../components/WrkspFooter/WrkspFooter';
import {setSelectedSoc} from '../../state/slices/workspace-config/workspace-config.reducer';

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
				<SocSelectionContainer />
			</div>
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

describe('SocSelection', () => {
	beforeEach(() => {
		cy.viewport(820, 600);
		cy.mount(<TestComponent />, store);
	});

	it('Should mount component', () => {
		cy.dataTest('soc-selection:container').should('exist');
	});

	it('Should yield correct search results', () => {
		cy.get('#control-input').shadow().find('input').type('32655');

		cy.dataTest('socSelection:card:MAX32655').should('exist');
		cy.dataTest('socSelection:card:MAX32670').should('not.exist');
	});

	it('Should yield <NoSearchResult> component on faulty search input', () => {
		cy.get('#control-input').shadow().find('input').type('XXXXXX');

		cy.dataTest('socSelection:card:MAX32655').should('not.exist');
		cy.dataTest('no-search-results').should('exist');
	});

	it('Should display CfsNotification when no SoC is selected and "Continue" is clicked', () => {
		const testStore = {...store};

		testStore.dispatch(setActiveScreen(navigationItems.socSelection));

		cy.mount(<TestComponent />, store).then(() => {
			cy.dataTest('soc-selection-error').should('not.exist');

			cy.dataTest('wrksp-footer:continue-btn').click();

			cy.dataTest('soc-selection-error').should('exist');
			cy.dataTest('soc-selection-error').should(
				'contain.text',
				'Please make a selection.'
			);
		});
	});

	it('Should correctly dispatch an SoC and enable the correct selection card', () => {
		const testStore = {...store};
		testStore.dispatch(setSelectedSoc('MAX32655'));

		cy.mount(<TestComponent />, store).then(() => {
			const cardTestId = 'socSelection:card:MAX32655';

			cy.dataTest(cardTestId).should('exist');
			cy.dataTest(cardTestId).should(
				'have.attr',
				'data-active',
				'true'
			);
		});
	});

	it('Should correctly filter the list based on the search', () => {
		cy.get('#control-input').shadow().find('input').type('MAX326');

		cy.dataTest('socSelection:card:MAX32655').should('exist');
		cy.dataTest('socSelection:card:MAX32672').should('exist');

		cy.dataTest('socSelection:card:MAX78002').should('not.exist');

		cy.get('#control-input').shadow().find('input').clear();

		cy.dataTest('socSelection:card:MAX32655').should('exist');
		cy.dataTest('socSelection:card:MAX32672').should('exist');
		cy.dataTest('socSelection:card:MAX78002').should('exist');
	});

	it('Should display <NoSearchResults> component with the correct message', () => {
		const searchQuery = 'test';
		cy.get('#control-input').shadow().find('input').type(searchQuery);

		cy.dataTest('socSelection:card:MAX32655').should('not.exist');

		cy.dataTest('no-search-results').should('exist');
		cy.dataTest('no-search-results').should(
			'contain.text',
			`We couldn't find any results for "${searchQuery}"`
		);
	});
});
