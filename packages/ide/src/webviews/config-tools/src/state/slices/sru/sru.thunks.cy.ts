/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import {configureStore} from '@reduxjs/toolkit';
import {setupMessengerMock} from '@common/test-utils/messenger-mock';
import type {Peripheral} from '@common/types/soc';
import {navigationItems} from '@common/constants/navigation';
import type {AppDispatch, RootState} from '../../store';
import {
	configureConnectionFromRouting,
	disconnectSruConnectionWithUndo,
	resetSruConnectionWithUndo,
	revealSruSignal
} from './sru.thunks';
import {
	setSignalAlias,
	setSruConnection,
	sruInitialState,
	sruReducer
} from './sru.reducer';
import {
	appContextInitialState,
	appContextReducer
} from '../app-context/appContext.reducer';
import {getSruUndoTrackingMiddleware} from '../../utils/sru-undo-tracking';
import {
	getSruDefaultConnections,
	initializeSruData
} from '../../../utils/sru';
import {initializeSocPeripherals} from '../../../utils/soc-peripherals';

type SentMessage = {
	id?: string;
	method: string;
	params?: Record<string, unknown>;
};

let sentMessages: SentMessage[];

let inputCounter = 0;

function nextInput(): string {
	inputCounter += 1;

	return `TEST_INPUT_${inputCounter}`;
}

function connectedState(input: string) {
	return {
		modifiedConnections: {[input]: 'GPIO_0'},
		userDescriptions: {[input]: 'My description'},
		lastRealSignal: {[input]: 'GPIO_0'}
	};
}

function createTestStore(overrides: Partial<typeof sruInitialState>) {
	const store = configureStore({
		reducer: {sruReducer},
		middleware: getDefaultMiddleware =>
			getDefaultMiddleware().concat(getSruUndoTrackingMiddleware()),
		preloadedState: {
			sruReducer: {...sruInitialState, ...overrides}
		}
	});

	return {
		dispatch: store.dispatch as unknown as AppDispatch,
		getState: store.getState as unknown as () => RootState
	};
}

/**
 * Combines `sruReducer` with `appContextReducer` so tests can observe
 * `configureConnectionFromRouting`'s subscreen switch alongside the SRU
 * state that `revealSruSignal` changes.
 */
function createRoutingTestStore(
	overrides: Partial<typeof sruInitialState>
) {
	const store = configureStore({
		reducer: {sruReducer, appContextReducer},
		middleware: getDefaultMiddleware =>
			getDefaultMiddleware().concat(getSruUndoTrackingMiddleware()),
		preloadedState: {
			sruReducer: {...sruInitialState, ...overrides},
			appContextReducer: appContextInitialState
		}
	});

	return {
		dispatch: store.dispatch as unknown as AppDispatch,
		getState: store.getState as unknown as () => RootState
	};
}

function respondToUndoNotificationWith(undo: boolean) {
	setupMessengerMock({
		'cfgtools/showSRUResetUndoNotification'(message: SentMessage) {
			sentMessages.push(message);

			return {undo};
		},
		'vscode/showInformationMessage'(message: SentMessage) {
			sentMessages.push(message);
		}
	});
}

/**
 * A peripheral with a single SRU input and output, both with no
 * `PeripheralSubGroup`/`Group`, so `groupSruSignals` gives it one fallback
 * signal group keyed by the peripheral's own name.
 */
function peripheralWithSignals(name: string): Peripheral {
	return {
		Name: name,
		Description: name,
		Cores: [],
		Signals: [],
		ClockNode: '',
		SRU: {
			Inputs: [
				{
					Name: `${name}_IN`,
					Description: `${name}_IN`,
					SignalType: 'Test Signals',
					Config: {}
				}
			],
			Outputs: [
				{
					Name: `${name}_OUT`,
					Description: `${name}_OUT`,
					SignalType: 'Test Signals'
				}
			]
		}
	};
}

/** Two peripherals both declaring the same output name, making it ambiguous. */
function ambiguousOutputPeripherals(
	outputName: string
): Peripheral[] {
	const declare = (name: string): Peripheral => ({
		Name: name,
		Description: name,
		Cores: [],
		Signals: [],
		ClockNode: '',
		SRU: {
			Inputs: [],
			Outputs: [
				{
					Name: outputName,
					Description: outputName,
					SignalType: 'Test Signals'
				}
			]
		}
	});

	return [declare('AMBIG_A'), declare('AMBIG_B')];
}

/**
 * Seeds the module-level SoC/SRU caches that `revealSruSignal` reads
 * (`getPeripheralList`, `getSruInputSignals`/`getSruOutputSignals`,
 * `getSruSignalPeripheral`, `canRevealSruSignal`), mirroring what
 * `sysPlannerDataInit` does for the real app.
 */
function seedSru(peripherals: Peripheral[]) {
	initializeSocPeripherals(peripherals);
	initializeSruData(peripherals);
}

describe('revealSruSignal', () => {
	it('selects the group, resets the status filter, expands the card, and opens the detail panel for an input signal', () => {
		seedSru([peripheralWithSignals('TEST_PERIPH_A')]);

		const {dispatch, getState} = createTestStore({
			connectionsFilter: {
				searchText: 'kept',
				statusFilter: 'modified'
			}
		});

		dispatch(revealSruSignal('TEST_PERIPH_A_IN'));

		const state = getState().sruReducer;

		expect(state.selectedSignalGroupKey).to.equal('TEST_PERIPH_A');
		// SearchText is left untouched; only statusFilter is reset.
		expect(state.connectionsFilter).to.deep.equal({
			searchText: 'kept',
			statusFilter: 'all'
		});
		expect(state.expandedSignals).to.deep.equal(['TEST_PERIPH_A_IN']);
		expect(state.editableConnections).to.deep.equal([
			{
				peripheralName: 'TEST_PERIPH_A',
				input: {
					Name: 'TEST_PERIPH_A_IN',
					Description: 'TEST_PERIPH_A_IN',
					SignalType: 'Test Signals',
					Config: {}
				}
			}
		]);
	});

	it('selects the group, resets the status filter, expands the card, and opens the detail panel for an output signal', () => {
		seedSru([peripheralWithSignals('TEST_PERIPH_A')]);

		const {dispatch, getState} = createTestStore({
			connectionsFilter: {searchText: '', statusFilter: 'default'}
		});

		dispatch(revealSruSignal('TEST_PERIPH_A_OUT'));

		const state = getState().sruReducer;

		expect(state.selectedSignalGroupKey).to.equal('TEST_PERIPH_A');
		expect(state.connectionsFilter.statusFilter).to.equal('all');
		expect(state.expandedSignals).to.deep.equal([
			'TEST_PERIPH_A_OUT'
		]);
		expect(state.editableConnections).to.deep.equal([
			{
				peripheralName: 'TEST_PERIPH_A',
				output: {
					Name: 'TEST_PERIPH_A_OUT',
					Description: 'TEST_PERIPH_A_OUT',
					SignalType: 'Test Signals'
				}
			}
		]);
	});

	it('does not add a duplicate entry when the signal card is already expanded', () => {
		seedSru([peripheralWithSignals('TEST_PERIPH_A')]);

		const {dispatch, getState} = createTestStore({
			expandedSignals: ['TEST_PERIPH_A_IN']
		});

		dispatch(revealSruSignal('TEST_PERIPH_A_IN'));

		expect(getState().sruReducer.expandedSignals).to.deep.equal([
			'TEST_PERIPH_A_IN'
		]);
	});

	it('no-ops for a signal declared by more than one peripheral', () => {
		seedSru(ambiguousOutputPeripherals('AMBIG_OUT'));

		const {dispatch, getState} = createTestStore({});

		dispatch(revealSruSignal('AMBIG_OUT'));

		expect(getState().sruReducer).to.deep.equal(sruInitialState);
	});

	it('no-ops for a signal name unknown to the SoC', () => {
		seedSru([peripheralWithSignals('TEST_PERIPH_A')]);

		const {dispatch, getState} = createTestStore({});

		dispatch(revealSruSignal('NOT_A_REAL_SIGNAL'));

		expect(getState().sruReducer).to.deep.equal(sruInitialState);
	});
});

describe('configureConnectionFromRouting', () => {
	it('switches to the Connections subscreen, clears the search text, and reveals the resolved input', () => {
		seedSru([peripheralWithSignals('TEST_PERIPH_A')]);

		const {dispatch, getState} = createRoutingTestStore({
			connectionsFilter: {searchText: 'stale', statusFilter: 'all'}
		});

		dispatch(configureConnectionFromRouting('TEST_PERIPH_A_IN'));

		expect(
			getState().appContextReducer.activeScreenSubscreen
		).to.equal(navigationItems.signalRoutingUnitConnections);
		expect(
			getState().sruReducer.connectionsFilter.searchText
		).to.equal('');
		expect(getState().sruReducer.selectedSignalGroupKey).to.equal(
			'TEST_PERIPH_A'
		);
	});

	it('leaves the subscreen and search text untouched when the input cannot be resolved, instead of a half-completed navigation', () => {
		seedSru([peripheralWithSignals('TEST_PERIPH_A')]);

		const {dispatch, getState} = createRoutingTestStore({
			connectionsFilter: {searchText: 'kept', statusFilter: 'all'}
		});

		dispatch(configureConnectionFromRouting('NOT_A_REAL_SIGNAL'));

		expect(
			getState().appContextReducer.activeScreenSubscreen
		).to.equal(appContextInitialState.activeScreenSubscreen);
		expect(
			getState().sruReducer.connectionsFilter.searchText
		).to.equal('kept');
		expect(getState().sruReducer.selectedSignalGroupKey).to.equal(
			sruInitialState.selectedSignalGroupKey
		);
	});

	it('leaves the subscreen and search text untouched for a signal declared by more than one peripheral', () => {
		seedSru(ambiguousOutputPeripherals('AMBIG_OUT'));

		const {dispatch, getState} = createRoutingTestStore({
			connectionsFilter: {searchText: 'kept', statusFilter: 'all'}
		});

		dispatch(configureConnectionFromRouting('AMBIG_OUT'));

		expect(
			getState().appContextReducer.activeScreenSubscreen
		).to.equal(appContextInitialState.activeScreenSubscreen);
		expect(
			getState().sruReducer.connectionsFilter.searchText
		).to.equal('kept');
	});
});

describe('resetSruConnectionWithUndo', () => {
	beforeEach(() => {
		sentMessages = [];
	});

	it('does nothing when the input has no modified connection', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch, getState} = createTestStore({});

		dispatch(resetSruConnectionWithUndo(input));

		expect(getState().sruReducer.modifiedConnections).to.deep.equal(
			{}
		);
		expect(sentMessages).to.have.length(0);
	});

	it('resets the connection immediately, without waiting for the notification to be answered', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch, getState} = createTestStore(
			connectedState(input)
		);

		dispatch(resetSruConnectionWithUndo(input));

		expect(
			getState().sruReducer.modifiedConnections
		).to.not.have.property(input);
		expect(
			getState().sruReducer.userDescriptions
		).to.not.have.property(input);
		expect(getState().sruReducer.lastRealSignal).to.not.have.property(
			input
		);
	});

	it('requests the undo notification for the reset input', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch} = createTestStore(connectedState(input));

		dispatch(resetSruConnectionWithUndo(input));

		expect(sentMessages).to.have.length(1);
		expect(sentMessages[0].method).to.equal(
			'cfgtools/showSRUResetUndoNotification'
		);
		expect(sentMessages[0].params).to.deep.equal({
			message: 'signalRoutingUnit.routing.resetUndo.message',
			undoButtonLabel:
				'signalRoutingUnit.routing.resetUndo.undoButton'
		});
	});

	it('restores the previous connection when Undo is clicked and nothing else changed', () => {
		respondToUndoNotificationWith(true);

		const input = nextInput();
		const before = connectedState(input);
		const {dispatch, getState} = createTestStore(before);

		dispatch(resetSruConnectionWithUndo(input));

		cy.wrap(null).should(() => {
			expect(
				getState().sruReducer.modifiedConnections[input]
			).to.equal(before.modifiedConnections[input]);
			expect(getState().sruReducer.userDescriptions[input]).to.equal(
				before.userDescriptions[input]
			);
			expect(getState().sruReducer.lastRealSignal[input]).to.equal(
				before.lastRealSignal[input]
			);
		});
	});

	it('stays reset when the notification is dismissed without clicking Undo', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch, getState} = createTestStore(
			connectedState(input)
		);

		dispatch(resetSruConnectionWithUndo(input));

		cy.wrap(null).should(() => {
			expect(
				getState().sruReducer.modifiedConnections
			).to.not.have.property(input);
		});
	});

	it('ignores a stale Undo click when the input was reconfigured before the user responded, and tells the user why', () => {
		respondToUndoNotificationWith(true);

		const input = nextInput();
		const {dispatch, getState} = createTestStore(
			connectedState(input)
		);

		dispatch(resetSruConnectionWithUndo(input));

		// Runs synchronously, in the same tick as the dispatch above and
		// before its pending "wait for the undo notification" promise
		// settles - simulating the user rerouting the same input again
		// before responding to the reset's undo toast.
		dispatch(setSruConnection({input, source: 'GPIO_1'}));

		cy.wrap(null).should(() => {
			// The stale Undo must not clobber the newer connection...
			expect(
				getState().sruReducer.modifiedConnections[input]
			).to.equal('GPIO_1');
			// ...and the user is told the undo could no longer be applied.
			expect(
				sentMessages.some(
					message =>
						message.method === 'vscode/showInformationMessage'
				)
			).to.equal(true);
		});
	});

	it('preserves polarity inversion when resetting a rerouted input', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch, getState} = createTestStore({
			...connectedState(input),
			signalInversions: {[input]: true}
		});

		dispatch(resetSruConnectionWithUndo(input, {mode: 'remove'}));

		expect(
			getState().sruReducer.modifiedConnections
		).to.not.have.property(input);
		expect(getState().sruReducer.signalInversions[input]).to.equal(
			true
		);
	});

	it('preserves the signal alias when removing a connection, including after Undo', () => {
		respondToUndoNotificationWith(true);

		const input = nextInput();
		const alias = 'dai0_invert';
		const {dispatch, getState} = createTestStore({
			...connectedState(input),
			signalAliases: {[input]: alias},
			signalInversions: {[input]: true}
		});

		dispatch(resetSruConnectionWithUndo(input, {mode: 'remove'}));

		expect(getState().sruReducer.signalAliases[input]).to.equal(
			alias
		);
		expect(getState().sruReducer.signalInversions[input]).to.equal(
			true
		);
		expect(
			getState().sruReducer.modifiedConnections
		).to.not.have.property(input);

		cy.wrap(null).should(() => {
			expect(getState().sruReducer.signalAliases[input]).to.equal(
				alias
			);
			expect(getState().sruReducer.signalInversions[input]).to.equal(
				true
			);
			expect(
				getState().sruReducer.modifiedConnections[input]
			).to.equal('GPIO_0');
		});
	});

	it('ignores a stale Undo when the signal alias changes before the user responds', () => {
		respondToUndoNotificationWith(true);

		const input = nextInput();
		const {dispatch, getState} = createTestStore({
			...connectedState(input),
			signalAliases: {[input]: 'original_alias'}
		});

		dispatch(resetSruConnectionWithUndo(input));

		expect(getState().sruReducer.signalAliases).to.not.have.property(
			input
		);

		// Change the alias before the pending Undo notification resolves.
		dispatch(
			setSignalAlias({signalName: input, alias: 'newer_alias'})
		);

		cy.wrap(null).should(() => {
			expect(getState().sruReducer.signalAliases[input]).to.equal(
				'newer_alias'
			);
			expect(
				sentMessages.some(
					message =>
						message.method === 'vscode/showInformationMessage'
				)
			).to.equal(true);
		});
	});
});

describe('disconnectSruConnectionWithUndo', () => {
	beforeEach(() => {
		sentMessages = [];
	});

	it("does nothing when the input's SoC default is already LOW", () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();

		// Bypasses the full SoC/Controls pipeline that normally computes
		// this - `getSruDefaultConnections()` returns the live cache by
		// reference, so writing to it directly is enough to seed the one
		// precondition this thunk's guard checks.
		getSruDefaultConnections()[input] = 'LOW';

		const {dispatch, getState} = createTestStore({});

		dispatch(disconnectSruConnectionWithUndo(input));

		expect(getState().sruReducer.modifiedConnections).to.deep.equal(
			{}
		);
		expect(sentMessages).to.have.length(0);
	});

	it('disconnects the input to LOW immediately, without waiting for the notification to be answered', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch, getState} = createTestStore({});

		dispatch(disconnectSruConnectionWithUndo(input));

		expect(getState().sruReducer.modifiedConnections[input]).to.equal(
			'LOW'
		);
	});

	it('requests the undo notification for the disconnected input', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch} = createTestStore({});

		dispatch(disconnectSruConnectionWithUndo(input));

		expect(sentMessages).to.have.length(1);
		expect(sentMessages[0].method).to.equal(
			'cfgtools/showSRUResetUndoNotification'
		);
		expect(sentMessages[0].params).to.deep.equal({
			message: 'signalRoutingUnit.routing.disconnectUndo.message',
			undoButtonLabel:
				'signalRoutingUnit.routing.disconnectUndo.undoButton'
		});
	});

	it('restores the previous descriptions and remembered signal, and removes the LOW override, when Undo is clicked and nothing else changed', () => {
		respondToUndoNotificationWith(true);

		const input = nextInput();
		// A `'default'` entry never has a `modifiedConnections` override
		// (that's what makes it default), but it can still carry a user
		// description or a remembered signal from before - neither is
		// affected by connection status.
		const before = {
			userDescriptions: {[input]: 'My description'},
			lastRealSignal: {[input]: 'GPIO_0'}
		};
		const {dispatch, getState} = createTestStore(before);

		dispatch(disconnectSruConnectionWithUndo(input));

		cy.wrap(null).should(() => {
			expect(
				getState().sruReducer.modifiedConnections
			).to.not.have.property(input);
			expect(getState().sruReducer.userDescriptions[input]).to.equal(
				before.userDescriptions[input]
			);
			expect(getState().sruReducer.lastRealSignal[input]).to.equal(
				before.lastRealSignal[input]
			);
		});
	});

	it('stays disconnected when the notification is dismissed without clicking Undo', () => {
		respondToUndoNotificationWith(false);

		const input = nextInput();
		const {dispatch, getState} = createTestStore({});

		dispatch(disconnectSruConnectionWithUndo(input));

		cy.wrap(null).should(() => {
			expect(
				getState().sruReducer.modifiedConnections[input]
			).to.equal('LOW');
		});
	});

	it('ignores a stale Undo click when the input was reconfigured before the user responded, and tells the user why', () => {
		respondToUndoNotificationWith(true);

		const input = nextInput();
		const {dispatch, getState} = createTestStore({});

		dispatch(disconnectSruConnectionWithUndo(input));

		// Runs synchronously, in the same tick as the dispatch above and
		// before its pending "wait for the undo notification" promise
		// settles - simulating the user rerouting the same input again
		// before responding to the disconnect's undo toast.
		dispatch(setSruConnection({input, source: 'GPIO_1'}));

		cy.wrap(null).should(() => {
			// The stale Undo must not clobber the newer connection...
			expect(
				getState().sruReducer.modifiedConnections[input]
			).to.equal('GPIO_1');
			// ...and the user is told the undo could no longer be applied.
			expect(
				sentMessages.some(
					message =>
						message.method === 'vscode/showInformationMessage'
				)
			).to.equal(true);
		});
	});
});
