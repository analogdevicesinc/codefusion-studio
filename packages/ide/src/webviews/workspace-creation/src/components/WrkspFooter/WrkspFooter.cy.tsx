import {store} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import WrkspFooter from './WrkspFooter';
import {navigationItems} from '../../common/constants/navigation';
import {} from '../../state/slices/workspace-config/workspace-config.reducer';

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
			<div>
				<WrkspFooter />
			</div>
		</div>
	);
}

describe('WrkspFooter', () => {
	it('Should show/hide the buttons correctly based on current screen, with the correct label', () => {
		cy.viewport(1068, 688);
		const testStore = {...store};

		testStore.dispatch(setActiveScreen(navigationItems.socSelection));

		cy.mount(<TestComponent />, testStore)
			.then(() => {
				cy.dataTest('wrksp-footer:back-btn').should('not.be.visible');
				cy.dataTest('wrksp-footer:continue-btn').should('be.visible');
			})
			.then(() => {
				cy.wrap(
					testStore.dispatch(
						setActiveScreen(navigationItems.pathSelection)
					)
				).then(() => {
					cy.dataTest('wrksp-footer:back-btn').should('be.visible');
					cy.dataTest('wrksp-footer:continue-btn').should(
						'have.text',
						'Create Workspace'
					);
				});
			})
			.then(() => {
				cy.wrap(
					testStore.dispatch(
						setActiveScreen(navigationItems.coreConfig)
					)
				).then(() => {
					cy.dataTest('wrksp-footer:back-btn')
						.should('be.visible')
						.and('have.text', 'Back');
					cy.dataTest('wrksp-footer:continue-btn').should(
						'have.text',
						'Continue'
					);
				});
			});
	});
});
