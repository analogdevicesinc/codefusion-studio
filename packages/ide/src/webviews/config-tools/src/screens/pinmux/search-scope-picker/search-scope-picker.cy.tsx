import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import SearchScopePicker from './search-scope-picker';
import {setActiveSearchString} from '../../../state/slices/app-context/appContext.reducer';
import PinMUX from '../PinMux';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

describe('PinMUX search scope picker component', () => {
	beforeEach(() => {
		cy.viewport(400, 600);
	});

	it('Should display the correct options for pins', () => {
		const reduxStore = configurePreloadedStore(mock);

		const EXPECTED_PIN_RESULTS = [
			{
				title: 'P1.1',
				subtitle: '(C4)'
			},
			{
				title: 'P1.10',
				subtitle: '(E4)'
			},
			{
				title: 'P1.11',
				subtitle: '(B6)'
			},
			{
				title: 'P1.12',
				subtitle: '(C7)'
			}
		];

		cy.mount(<SearchScopePicker />, reduxStore);

		reduxStore.dispatch(
			setActiveSearchString({
				searchContext: 'pinconfig',
				value: 'P1.1'
			})
		);

		cy.dataTest('filter-control:pins').click();

		EXPECTED_PIN_RESULTS.forEach(result => {
			cy.dataTest(
				`search-result-${result.title}-${result.subtitle}`
			).should('exist');
		});
	});

	it('Should display the correct options for peripherals', () => {
		const reduxStore = configurePreloadedStore(mock);

		const EXPECTED_PERIPHERAL_RESULTS = [
			{
				title: 'GPIO0'
			},
			{
				title: 'GPIO1'
			},
			{
				title: 'GPIO2'
			},
			{
				title: 'GPIO3'
			},
			{
				title: 'GPIO4'
			}
		];

		cy.mount(<SearchScopePicker />, reduxStore);

		reduxStore.dispatch(
			setActiveSearchString({
				searchContext: 'pinconfig',
				value: 'GPIO'
			})
		);

		cy.dataTest('filter-control:peripherals').click();

		EXPECTED_PERIPHERAL_RESULTS.forEach(result => {
			cy.dataTest(`search-result-${result.title}-undefined`).should(
				'exist'
			);
		});
	});

	it('Should display the correct options for signals', () => {
		const reduxStore = configurePreloadedStore(mock);

		const EXPECTED_SIGNAL_RESULTS = [
			{
				title: 'LPUART0 CTS'
			},
			{
				title: 'UART0 CTS'
			},
			{
				title: 'UART1 CTS'
			},
			{
				title: 'UART2 CTS'
			}
		];

		cy.mount(<SearchScopePicker />, reduxStore);

		reduxStore.dispatch(
			setActiveSearchString({
				searchContext: 'pinconfig',
				value: 'CTS'
			})
		);

		cy.dataTest('filter-control:signals').click();

		EXPECTED_SIGNAL_RESULTS.forEach(result => {
			cy.dataTest(`search-result-${result.title}-undefined`).should(
				'exist'
			);
		});
	});

	it('Should not display duplicate signals', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<SearchScopePicker />, reduxStore);

		reduxStore.dispatch(
			setActiveSearchString({
				searchContext: 'pinconfig',
				value: 'SDA'
			})
		);

		cy.dataTest('filter-control:signals').click();

		cy.dataTest('search-result-I2C0 SDA-undefined').should(
			'have.length',
			1
		);
	});

	it('Should display no results found', () => {
		const reduxStore = configurePreloadedStore(mock);
		cy.mount(<SearchScopePicker />, reduxStore);

		reduxStore.dispatch(
			setActiveSearchString({
				searchContext: 'pinconfig',
				value: 'UNKNOWN_SEARCH_TERM'
			})
		);

		cy.dataTest('filter-control:pins').should('be.disabled');
		cy.dataTest('filter-control:peripherals').should('be.disabled');
		cy.dataTest('filter-control:signals').should('be.disabled');

		cy.dataTest('no-results').should('exist');
	});

	it('Should reset filter assignment to undefined after a click on the result', () => {
		const reduxStore = configurePreloadedStore(mock);
		cy.viewport(1200, 1200);
		cy.mount(<PinMUX />, reduxStore);

		cy.dataTest('filter-control:available')
			.click()
			.then(() => {
				const activeFilterType =
					reduxStore.getState().appContextReducer.filter.pinconfig
						.assignment;
				expect(activeFilterType).to.equal('available');
			})
			.then(() => {
				reduxStore.dispatch(
					setActiveSearchString({
						searchContext: 'pinconfig',
						value: 'SDA'
					})
				);
			})
			.then(() => {
				cy.dataTest('search-result-I2C0 SDA-undefined').click();
			})
			.then(() => {
				const activeFilterType =
					reduxStore.getState().appContextReducer.filter.pinconfig
						.assignment;
				expect(activeFilterType).to.equal(undefined);
			});
	});

	it('Should show pins reserved message when selecting a peripheral with all pins reserved', () => {
		const reduxStore = configurePreloadedStore(mock);
		cy.viewport(1200, 1200);
		cy.mount(<PinMUX />, reduxStore);

		reduxStore.dispatch(setActivePeripheral('MISC'));
		reduxStore.dispatch(
			setActiveSignal({
				peripheral: 'MISC',
				signal: 'RSTN',
				keepActivePeripheral: true
			})
		);

		cy.dataTest('peripheral-pins-reserved:MISC').should('exist');
	});
});
