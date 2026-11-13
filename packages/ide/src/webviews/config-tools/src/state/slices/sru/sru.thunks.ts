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
import {navigationItems} from '@common/constants/navigation';
import {showInformationMessage} from '@common/api';
import {
	getLocalization,
	localizeMessage
} from '@common/utils/localization';
import type {AppThunk} from '../../store';
import {setActiveScreenSubscreen} from '../app-context/appContext.reducer';
import {showSruResetUndoNotification} from '../../../utils/api';
import {
	canRevealSruSignal,
	getSruDefaultConnections,
	getSruInputSignals,
	getSruOutputSignals,
	getSruSignalPeripheral
} from '../../../utils/sru';
import {
	findSignalGroupForSignal,
	getSruSignalGroups
} from '../../../utils/sru-navigation';
import {sruChangeTracker} from '../../utils/sru-undo-tracking';
import {
	resetSruConnection,
	restoreSruConnection,
	selectSruInput,
	selectSruOutput,
	setConnectionsFilter,
	setExpandedSignals,
	setSelectedSignalGroup,
	setSignalAlias,
	setSignalInversion,
	setSruConnection
} from './sru.reducer';

/**
 * Selects the Connections side-panel signal group owning `signalName`
 * (input or output), expands its card, opens the details panel on it, and
 * resets the status filter to `'all'` so the card can't land hidden behind
 * a stale `'default'`/`'modified'` filter. Leaves `searchText` untouched.
 *
 * No-ops when `signalName` cannot be resolved to exactly one peripheral -
 * see {@link canRevealSruSignal} - or to a signal group. Returns whether
 * the signal was actually revealed, so callers can avoid navigating away
 * on a no-op - see {@link configureConnectionFromRouting}.
 *
 * Order matters — `setSelectedSignalGroup` clears `editableConnections`, so
 * `selectSruInput`/`selectSruOutput` must run after it.
 */
export const revealSruSignal =
	(signalName: string): AppThunk<boolean> =>
	(dispatch, getState) => {
		if (!canRevealSruSignal(signalName)) {
			return false;
		}

		const input = getSruInputSignals()[signalName];
		const output = input
			? undefined
			: getSruOutputSignals()[signalName];

		if (!input && !output) {
			return false;
		}

		const signalGroup = findSignalGroupForSignal(
			getSruSignalGroups(),
			signalName
		);
		const peripheralName =
			getSruSignalPeripheral(signalName) ??
			signalGroup?.peripheralName;

		if (!signalGroup || !peripheralName) {
			return false;
		}

		dispatch(setConnectionsFilter({statusFilter: 'all'}));
		dispatch(setSelectedSignalGroup(signalGroup.key));

		const {expandedSignals} = getState().sruReducer;

		if (!expandedSignals.includes(signalName)) {
			dispatch(setExpandedSignals([...expandedSignals, signalName]));
		}

		if (input) {
			dispatch(selectSruInput({peripheralName, input}));
		} else if (output) {
			dispatch(selectSruOutput({peripheralName, output}));
		}

		return true;
	};

/**
 * Navigates from the Routing table to the Connections subscreen and focuses
 * the given destination input: defers to {@link revealSruSignal} first, and
 * only switches subscreen and clears the search text once it confirms the
 * input actually resolves to a signal - leaving the user untouched on the
 * Routing table otherwise, instead of a half-completed navigation.
 */
export const configureConnectionFromRouting =
	(inputName: string): AppThunk =>
	dispatch => {
		const revealed = dispatch(revealSruSignal(inputName));

		if (!revealed) {
			return;
		}

		dispatch(
			setActiveScreenSubscreen(
				navigationItems.signalRoutingUnitConnections
			)
		);
		dispatch(setConnectionsFilter({searchText: ''}));
	};

type SruConnectionResetMode = 'reset' | 'remove';

export const resetSruConnectionWithUndo =
	(
		input: string,
		{mode = 'reset'}: {mode?: SruConnectionResetMode} = {}
	): AppThunk =>
	(dispatch, getState) => {
		const {
			modifiedConnections,
			userDescriptions,
			lastRealSignal,
			signalAliases,
			signalInversions
		} = getState().sruReducer;

		const wasInverted = signalInversions[input] === true;

		if (
			!(input in modifiedConnections) &&
			!wasInverted &&
			(mode === 'remove' || !(input in signalAliases))
		) {
			// Reset is a no-op when the input has no modified connection,
			// polarity inversion, or alias. Remove only acts on a modified
			// connection or polarity inversion.
			return;
		}

		const previous = {
			modifiedConnections: modifiedConnections[input],
			userDescriptions: userDescriptions[input],
			lastRealSignal: lastRealSignal[input],
			signalAlias: signalAliases[input]
		};

		dispatch(resetSruConnection(input));

		if (mode === 'reset') {
			dispatch(setSignalAlias({signalName: input, alias: ''}));
		}

		// Polarity is deliberately excluded from `resetSruConnection` (see
		// `SruState.signalInversions`) so a connection delete/de-select
		// can't silently clear it - only an explicit reset clears it.
		if (wasInverted && mode === 'reset') {
			dispatch(setSignalInversion({input, inverted: false}));
		}

		const token = sruChangeTracker.getToken(input);

		const translations = getLocalization('cfgtools');

		const message = localizeMessage(
			translations,
			'signalRoutingUnit.routing.resetUndo.message',
			{input}
		);

		const undoButtonLabel = localizeMessage(
			translations,
			'signalRoutingUnit.routing.resetUndo.undoButton'
		);

		showSruResetUndoNotification(message, undoButtonLabel)
			.then(undo => {
				if (!undo) {
					return;
				}

				if (!sruChangeTracker.isCurrent(input, token)) {
					void showInformationMessage(
						localizeMessage(
							translations,
							'signalRoutingUnit.routing.resetUndo.staleMessage',
							{input}
						)
					);

					return;
				}

				dispatch(restoreSruConnection({input, ...previous}));

				if (mode === 'reset') {
					dispatch(
						setSignalAlias({
							signalName: input,
							alias: previous.signalAlias ?? ''
						})
					);
				}

				if (wasInverted && mode === 'reset') {
					dispatch(setSignalInversion({input, inverted: true}));
				}
			})
			.catch(e => {
				console.error(
					'There was an error showing the SRU reset undo notification: ',
					e
				);
			});
	};

/**
 * Disconnects an SRU input that is currently at its SoC default by routing
 * it to the constant `LOW` signal, with the same undo affordance as
 * {@link resetSruConnectionWithUndo}. No-ops when the input's SoC default is
 * already `LOW` - matches the delete button's disabled condition, since
 * there's nothing left to disconnect.
 *
 * Unlike `resetSruConnectionWithUndo`, polarity inversion is never touched
 * here: a `'default'` connection entry (the only case this is called for)
 * implies `signalInversions[input]` isn't `true` - see
 * `buildConnectionEntries` in `sru.selector.ts`.
 */
export const disconnectSruConnectionWithUndo =
	(input: string): AppThunk =>
	(dispatch, getState) => {
		const {modifiedConnections, userDescriptions, lastRealSignal} =
			getState().sruReducer;

		if (getSruDefaultConnections()[input] === 'LOW') {
			return;
		}

		const previous = {
			modifiedConnections: modifiedConnections[input],
			userDescriptions: userDescriptions[input],
			lastRealSignal: lastRealSignal[input]
		};

		dispatch(setSruConnection({input, source: 'LOW'}));

		const token = sruChangeTracker.getToken(input);

		const translations = getLocalization('cfgtools');

		const message = localizeMessage(
			translations,
			'signalRoutingUnit.routing.disconnectUndo.message',
			{input}
		);

		const undoButtonLabel = localizeMessage(
			translations,
			'signalRoutingUnit.routing.disconnectUndo.undoButton'
		);

		showSruResetUndoNotification(message, undoButtonLabel)
			.then(undo => {
				if (!undo) {
					return;
				}

				if (!sruChangeTracker.isCurrent(input, token)) {
					void showInformationMessage(
						localizeMessage(
							translations,
							'signalRoutingUnit.routing.disconnectUndo.staleMessage',
							{input}
						)
					);

					return;
				}

				dispatch(restoreSruConnection({input, ...previous}));
			})
			.catch(e => {
				console.error(
					'There was an error showing the SRU disconnect undo notification: ',
					e
				);
			});
	};
