import type {Soc} from '@common/types/soc';
import Navigation from './Navigation';
import {type CfsConfig} from 'cfs-plugins-api';
import {configurePreloadedStore} from '../../state/store';
import {resetClockNodes} from '../../utils/clock-nodes';
import {resetCoreMemoryDictionary} from '../../utils/memory';
import {resetPinDictionary} from '../../utils/soc-pins';
import {resetDfg} from '../../utils/dfg';

const socMax = await import('@socs/max32690-wlp.json').then(
	module => module.default as unknown as Soc
);

describe('Navigation', () => {
	beforeEach(() => {
		cy.clearLocalStorage();
	});

	describe('in MAX32690', () => {
		beforeEach(() => {
			resetClockNodes();
			resetCoreMemoryDictionary();
			resetDfg();
			resetPinDictionary();
		});

		it('should not render DFG tab when the Gaskets is not present in the config, or gaskets is empty', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			const CSSGasket = cy.get('[data-test="nav-item:dfg"]');
			CSSGasket.should('not.exist');
		});

		it('should render Clock Config tab when the ClockNodes is present in the config', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			const CSSClockConfig = cy.get(
				'[data-test="nav-item:clockconfig"]'
			);
			CSSClockConfig.should('exist');
		});

		it('should render Memory tab when the Memory is present in the config', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			const CSSMemory = cy.get('[data-test="nav-item:memory"]');
			CSSMemory.should('exist');
		});

		it('should render Pinmux tab when the Pins are present in the config', () => {
			const reduxStore = configurePreloadedStore(
				socMax,
				{} as CfsConfig
			);
			cy.mount(<Navigation />, reduxStore);

			const CSSMemory = cy.get('[data-test="nav-item:pinmux"]');
			CSSMemory.should('exist');
		});
	});
});
