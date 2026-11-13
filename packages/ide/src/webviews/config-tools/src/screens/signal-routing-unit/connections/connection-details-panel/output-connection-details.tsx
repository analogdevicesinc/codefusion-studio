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

import {useCallback, useMemo, useState} from 'react';
import {SearchableMultiSelect, Tooltip} from 'cfs-react-library';
import type {SruOutputSignal} from 'cfs-types';
import ConfigSection from '../../../../components/config-panel/config-section/ConfigSection';
import {useAppDispatch} from '../../../../state/store';
import {
	clearEditableConnections,
	setSruConnection,
	setSignalAlias,
	setUserDescription
} from '../../../../state/slices/sru/sru.reducer';
import {
	useSruConnectedInputs,
	useSruConnectionByInput,
	useSruSignalAlias,
	useSruSignalAliasesFor,
	useSruSignalInversions,
	useSruUserDescriptionsFor
} from '../../../../state/slices/sru/sru.selector';
import type {SruReroute} from '../../../../types/sru';
import {
	getSruDefaultConnections,
	getSruReroutes,
	getSruSelectableInputs
} from '../../../../utils/sru';
import {formatAliasedOptionLabel} from '../../common/aliased-signal-label';
import {AliasField} from './alias-field';
import {
	ConnectionDetailsShell,
	DetailsField,
	SignalSummary
} from './connection-details-shell';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import {RerouteConfirmDialog} from './reroute-confirm-dialog';
import {SelectedInputsList} from './selected-inputs-list';
import {
	disconnectSruConnectionWithUndo,
	resetSruConnectionWithUndo
} from '../../../../state/slices/sru/sru.thunks';

type OutputConnectionDetailsProps = {
	readonly output: SruOutputSignal;
	readonly peripheralName: string;
};

/**
 * Connection details for an SRU output signal: the source is the output
 * itself, the destination is a multi-select over the inputs that can be routed
 * from it. Deselecting an input whose SoC default source is this output
 * disconnects it to LOW rather than resetting an override (there is none);
 * only inputs whose default is already LOW - i.e. editing the LOW output
 * itself - are locked, since there's nothing left to disconnect.
 *
 * Staged state is seeded once on mount, so the panel must be remounted (via a
 * `key`) when the edited signal changes.
 */
export function OutputConnectionDetails({
	output,
	peripheralName
}: OutputConnectionDetailsProps) {
	const dispatch = useAppDispatch();
	const detailsL10n = useConnectionDetailsL10n();
	const outputName = output.Name;
	const connectedInputs = useSruConnectedInputs(outputName);
	const connectionByInput = useSruConnectionByInput();
	const [stagedInputs, setStagedInputs] = useState<Set<string>>(
		() => new Set(connectedInputs)
	);
	const [pendingReroutes, setPendingReroutes] = useState<
		SruReroute[] | undefined
	>();

	const defaultConnections = getSruDefaultConnections();
	const signalInversions = useSruSignalInversions();
	// This output's own connections can never be "removed" any further once
	// they're already routed to LOW - see the matching check in
	// `signal-card.tsx`'s delete button.
	const outputIsLow = outputName === 'LOW';
	const selectableInputNames = useMemo(
		() => getSruSelectableInputs(outputName),
		[outputName]
	);

	const currentDescriptions = useSruUserDescriptionsFor(
		selectableInputNames
	);
	const [stagedDescriptions, setStagedDescriptions] = useState<
		Record<string, string>
	>(() => currentDescriptions);

	const currentAlias = useSruSignalAlias(outputName);
	const [stagedAlias, setStagedAlias] = useState(currentAlias ?? '');
	const inputAliases = useSruSignalAliasesFor(selectableInputNames);

	const getStagedDescription = useCallback(
		(inputName: string): string =>
			stagedDescriptions[inputName] ?? '',
		[stagedDescriptions]
	);

	const handleDescriptionChange = useCallback(
		(inputName: string, value: string) => {
			setStagedDescriptions(previous => ({
				...previous,
				[inputName]: value
			}));
		},
		[]
	);

	const inputOptions = useMemo(
		() =>
			selectableInputNames.map(name => {
				const isDefaultLocked =
					defaultConnections[name] === outputName;
				const isAlreadyDisconnected = isDefaultLocked && outputIsLow;
				const optionLabel = formatAliasedOptionLabel(
					name,
					inputAliases[name]
				);

				return {
					label: isAlreadyDisconnected ? (
						<Tooltip
							title={detailsL10n?.alreadyDisconnected}
							type='short'
						>
							<span>{optionLabel}</span>
						</Tooltip>
					) : (
						optionLabel
					),
					value: name,
					disabled: isAlreadyDisconnected
				};
			}),
		[
			selectableInputNames,
			defaultConnections,
			outputName,
			outputIsLow,
			inputAliases,
			detailsL10n?.alreadyDisconnected
		]
	);

	const stagedInputNames = useMemo(
		() => selectableInputNames.filter(name => stagedInputs.has(name)),
		[selectableInputNames, stagedInputs]
	);

	const selectedInputOptions = useMemo(
		() =>
			stagedInputNames.map(name => ({
				label: formatAliasedOptionLabel(name, inputAliases[name]),
				value: name,
				disabled:
					defaultConnections[name] === outputName && outputIsLow
			})),
		[
			stagedInputNames,
			defaultConnections,
			outputName,
			outputIsLow,
			inputAliases
		]
	);

	const handleDeleteInput = (name: string) => {
		setStagedInputs(previous => {
			const next = new Set(previous);
			next.delete(name);

			return next;
		});
	};

	const isDirty = useMemo(
		() =>
			selectableInputNames.some(
				name =>
					stagedInputs.has(name) !== connectedInputs.includes(name)
			) ||
			stagedInputNames.some(
				name =>
					getStagedDescription(name) !==
					(currentDescriptions[name] ?? '')
			) ||
			stagedAlias !== (currentAlias ?? ''),
		[
			selectableInputNames,
			stagedInputs,
			connectedInputs,
			stagedInputNames,
			getStagedDescription,
			currentDescriptions,
			stagedAlias,
			currentAlias
		]
	);

	const handleSave = () => {
		const connectedSet = new Set(connectedInputs);

		for (const inputName of selectableInputNames) {
			const isStaged = stagedInputs.has(inputName);
			const isConnected = connectedSet.has(inputName);
			const isDefaultLocked =
				defaultConnections[inputName] === outputName;

			if (isStaged && !isConnected) {
				dispatch(
					setSruConnection({
						input: inputName,
						source: outputName
					})
				);
			} else if (!isStaged && isConnected) {
				// A default connection has no override to reset - removing
				// it means explicitly disconnecting to LOW instead, same as
				// the Connections screen's delete button.
				if (isDefaultLocked) {
					dispatch(disconnectSruConnectionWithUndo(inputName));
				} else {
					dispatch(
						resetSruConnectionWithUndo(inputName, {mode: 'remove'})
					);
				}
			}
		}

		for (const inputName of stagedInputNames) {
			const description = getStagedDescription(inputName);

			if (description !== (currentDescriptions[inputName] ?? '')) {
				dispatch(setUserDescription({input: inputName, description}));
			}
		}

		if (stagedAlias !== (currentAlias ?? '')) {
			dispatch(
				setSignalAlias({signalName: outputName, alias: stagedAlias})
			);
		}
	};

	const handleBeforeSave = useCallback(() => {
		const reroutes = getSruReroutes({
			selectableInputNames,
			stagedInputs,
			connectedInputs,
			connectionByInput,
			newOutput: outputName
		});

		if (reroutes.length > 0) {
			setPendingReroutes(reroutes);

			return false;
		}

		return true;
	}, [
		selectableInputNames,
		stagedInputs,
		connectedInputs,
		connectionByInput,
		outputName
	]);

	const handleConfirmReroute = () => {
		handleSave();
		setPendingReroutes(undefined);
		dispatch(clearEditableConnections());
	};

	const handleCancelReroute = () => {
		setPendingReroutes(undefined);
	};

	return (
		<>
			<ConnectionDetailsShell
				isDirty={isDirty}
				onSave={handleSave}
				onBeforeSave={handleBeforeSave}
			>
				<ConfigSection
					isExpanded
					title={detailsL10n?.sourceDetails}
					dataTest='connection-details:source-section'
					variant='noChevron'
				>
					<SignalSummary
						signalName={outputName}
						description={output.Description}
						peripheralName={peripheralName}
						signalType={output.SignalType}
					>
						<AliasField
							value={stagedAlias}
							onChange={setStagedAlias}
						/>
					</SignalSummary>
				</ConfigSection>
				<ConfigSection
					isExpanded
					title={detailsL10n?.destinationDetails}
					dataTest='connection-details:destination-section'
					variant='noChevron'
				>
					<DetailsField label={detailsL10n?.inputSignals}>
						<SearchableMultiSelect
							variant='form'
							size='md'
							dataTest='connection-details-input-multiselect'
							dropdownText={detailsL10n?.selectInputSignals}
							chipText={String(stagedInputs.size)}
							options={inputOptions}
							initialSelectedOptions={selectedInputOptions}
							searchPlaceholder={detailsL10n?.searchSignals}
							noResultsText={detailsL10n?.noSignalsFound}
							onSelection={selected => {
								setStagedInputs(
									new Set(selected.map(option => option.value))
								);
							}}
						/>
					</DetailsField>
					<SelectedInputsList
						inputNames={stagedInputNames}
						outputName={outputName}
						defaultConnections={defaultConnections}
						signalInversions={signalInversions}
						signalAliases={inputAliases}
						getDescription={getStagedDescription}
						onDelete={handleDeleteInput}
						onDescriptionChange={handleDescriptionChange}
					/>
				</ConfigSection>
			</ConnectionDetailsShell>
			<RerouteConfirmDialog
				isOpen={pendingReroutes !== undefined}
				newOutput={outputName}
				reroutes={pendingReroutes ?? []}
				onConfirm={handleConfirmReroute}
				onCancel={handleCancelReroute}
			/>
		</>
	);
}
