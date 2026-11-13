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

		cy.dataTest('soc-selection:option:MAX32655').should('exist');
		cy.dataTest('soc-selection:option:MAX32670').should('not.exist');
	});

	it('Should enable/disable the expand/collapse all controls based on the groups open state', () => {
		// All groups start collapsed, so "Expand all" is enabled and "Collapse all" is disabled.
		cy.dataTest('soc-selection:segmented-controls:expand').should(
			'not.be.disabled'
		);
		cy.dataTest('soc-selection:segmented-controls:collapse').should(
			'be.disabled'
		);

		cy.dataTest('soc-selection:segmented-controls:expand').click();

		// All groups are now expanded, so "Expand all" is disabled and "Collapse all" is enabled.
		cy.dataTest('soc-selection:segmented-controls:expand').should(
			'be.disabled'
		);
		cy.dataTest('soc-selection:segmented-controls:collapse').should(
			'not.be.disabled'
		);

		cy.dataTest('soc-selection:segmented-controls:collapse').click();

		// Back to all groups collapsed.
		cy.dataTest('soc-selection:segmented-controls:expand').should(
			'not.be.disabled'
		);
		cy.dataTest('soc-selection:segmented-controls:collapse').should(
			'be.disabled'
		);

		// Typing a search forces every matching group open, so "Expand all" is disabled again.
		cy.get('#control-input').shadow().find('input').type('32655');

		cy.dataTest('soc-selection:segmented-controls:expand').should(
			'be.disabled'
		);
		cy.dataTest('soc-selection:segmented-controls:collapse').should(
			'not.be.disabled'
		);

		// Clearing the search collapses everything again.
		cy.get('#control-input').shadow().find('input').clear();

		cy.dataTest('soc-selection:segmented-controls:expand').should(
			'not.be.disabled'
		);
		cy.dataTest('soc-selection:segmented-controls:collapse').should(
			'be.disabled'
		);
	});

	it('Should yield <NoSearchResults> component on faulty search input', () => {
		cy.get('#control-input').shadow().find('input').type('XXXXXX');

		cy.dataTest('soc-selection:option:MAX32655').should('not.exist');
		cy.dataTest('no-search-results').should('exist');
	});

	it('Should yield <NoSearchResults> component on escaped special characters', () => {
		cy.get('#control-input').shadow().find('input').type('*');

		cy.dataTest('soc-selection:option:MAX32655').should('not.exist');
		cy.dataTest('no-search-results').should('exist');

		cy.get('#control-input').shadow().find('input').clear().type('?');

		cy.dataTest('soc-selection:option:MAX32655').should('not.exist');
		cy.dataTest('no-search-results').should('exist');

		cy.get('#control-input').shadow().find('input').clear().type('}');

		cy.dataTest('soc-selection:option:MAX32655').should('not.exist');
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
			const optionTestId = 'soc-selection:option:MAX32655';

			cy.dataTest('soc-selection:segmented-controls:expand').click();

			cy.dataTest(optionTestId).should('exist');
			cy.dataTest(optionTestId)
				.find('[role="radio"]')
				.should('have.attr', 'current-checked', 'true');
		});
	});

	it('Should correctly filter the list based on the search', () => {
		cy.get('#control-input').shadow().find('input').type('MAX326');

		cy.dataTest('soc-selection:option:MAX32655').should('exist');
		cy.dataTest('soc-selection:option:MAX32672').should('exist');

		cy.dataTest('soc-selection:option:MAX78002').should('not.exist');

		cy.get('#control-input').shadow().find('input').clear();

		cy.dataTest('soc-selection:segmented-controls:expand').click();

		cy.dataTest('soc-selection:option:MAX32655').should('exist');
		cy.dataTest('soc-selection:option:MAX32672').should('exist');
		cy.dataTest('soc-selection:option:MAX78002').should('exist');

		// Special case for CFSIO-18572 - ensure badge is not included in search highlighting
		cy.get('#control-input').shadow().find('input').type('1');
		cy.get('[data-test^="soc-selection:option:"]:visible').should(
			'have.length',
			1
		);
	});

	it('Should display <NoSearchResults> component with the correct message', () => {
		const searchQuery = 'test';
		cy.get('#control-input').shadow().find('input').type(searchQuery);

		cy.dataTest('soc-selection:option:MAX32655').should('not.exist');

		cy.dataTest('no-search-results').should('exist');
		cy.dataTest('no-results-description').and(
			'contain.text',
			`"${searchQuery}"`
		);
	});
});
