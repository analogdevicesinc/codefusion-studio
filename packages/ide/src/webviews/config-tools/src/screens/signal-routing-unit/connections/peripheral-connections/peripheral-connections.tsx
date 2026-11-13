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
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {
	CollapseAllIcon,
	EmptyState,
	ExpandAllIcon,
	SegmentedControls
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import type {SruPeripheralSignalGroup} from '../../../../utils/sru-navigation';
import {
	buildSruSignalCards,
	getPbenRestoreSignal,
	getPinBufferInputRestoreSignal,
	getPinBufferDirection,
	getPinBufferSignalName,
	isSignalExpandable,
	partitionDirectionControlInputs,
	type PinBufferDirection,
	type SruSignalCard
} from '../../../../utils/sru-signals';
import {getSruDefaultConnections} from '../../../../utils/sru';
import {getPinByPeripheralSignal} from '../../../../utils/soc-pins';
import type {SruConnectionEntry} from '../../../../state/slices/sru/sru.selector';
import {
	selectSruInput,
	selectSruOutput,
	setExpandedSignals,
	setSruConnection,
	toggleSignalExpanded
} from '../../../../state/slices/sru/sru.reducer';
import {
	disconnectSruConnectionWithUndo,
	resetSruConnectionWithUndo,
	revealSruSignal
} from '../../../../state/slices/sru/sru.thunks';
import {
	selectLastRealSignal,
	useEditableConnections,
	useSruConnectionByInput,
	useSruConnectionsByOutput,
	useSruConnectionsFilter,
	useSruEffectiveSource,
	useSruExpandedSignals,
	useSruLastRealSignal,
	useSruSelectionSequence,
	useSruSignalAliasesFor
} from '../../../../state/slices/sru/sru.selector';
import {
	useAppDispatch,
	useAppSelector
} from '../../../../state/store';
import {SignalGroup} from './signal-group';
import {DirectionLocationRow} from './direction-location-row';
import styles from './peripheral-connections.module.scss';

type PeripheralConnectionsProps = Readonly<{
	signalGroup: SruPeripheralSignalGroup;
}>;

/**
 * Connections main panel for the peripheral signal group selected in the side
 * panel. Lists the signal group's input and output signals as collapsible
 * cards, narrowed by the screen's status filter. Pin-buffer groups also
 * surface `IsPinBufferEnable` inputs in a dedicated Direction Controls
 * section and use the shorter Inputs/Outputs headings from Figma.
 */
export function PeripheralConnections({
	signalGroup
}: PeripheralConnectionsProps) {
	const dispatch = useAppDispatch();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit?.connections;

	const filter = useSruConnectionsFilter();
	const expandedSignals = useSruExpandedSignals();
	const editableConnection = useEditableConnections()?.[0];
	const focusedSignalName =
		editableConnection?.input?.Name ??
		editableConnection?.output?.Name;
	const selectionSequence = useSruSelectionSequence();
	const connectionsByOutput = useSruConnectionsByOutput();
	const connectionByInput = useSruConnectionByInput();
	const focusedCardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!focusedSignalName) return;

		focusedCardRef.current?.scrollIntoView({
			behavior: 'instant' as ScrollBehavior,
			block: 'nearest'
		});
		// Keyed on `selectionSequence` rather than `focusedSignalName` so
		// reselecting the same signal after the user has scrolled away still
		// re-scrolls it into view - the name alone doesn't change value in
		// that case. See the identical rationale in SruPeripheralGroup.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectionSequence]);

	const isPinBufferGroup = signalGroup.inputs.some(
		i => i.IsPinBufferEnable === true
	);

	const {inputs, directionControls} = useMemo(
		() => partitionDirectionControlInputs(signalGroup.inputs),
		[signalGroup.inputs]
	);

	const pbenSignal = directionControls[0];
	const pbenSource = useSruEffectiveSource(pbenSignal?.Name ?? '');
	const directionValue = getPinBufferDirection(pbenSource);
	const bidirectionalRestoreSignal = getPbenRestoreSignal(
		useSruLastRealSignal(pbenSignal?.Name ?? ''),
		pbenSignal
			? getSruDefaultConnections()[pbenSignal.Name]
			: undefined
	);
	const lastRealSignalByName = useAppSelector(selectLastRealSignal);
	const pinBufferInputRestoreByName = useMemo(() => {
		if (!isPinBufferGroup) return {};

		const defaults = getSruDefaultConnections();

		return Object.fromEntries(
			inputs.map(input => [
				input.Name,
				getPinBufferInputRestoreSignal(
					lastRealSignalByName[input.Name],
					defaults[input.Name]
				)
			])
		);
	}, [inputs, isPinBufferGroup, lastRealSignalByName]);

	const pinLocationValue = useMemo(() => {
		const pinSignalName = getPinBufferSignalName(signalGroup.label);
		const pin = getPinByPeripheralSignal(
			signalGroup.peripheralName,
			pinSignalName
		);

		return pin ? `${pin.Label} (${pin.Name})` : undefined;
	}, [signalGroup.label, signalGroup.peripheralName]);

	const lookupInputConnections = useCallback(
		(name: string) => {
			const entry = connectionByInput[name];

			return entry ? [entry] : [];
		},
		[connectionByInput]
	);

	const lookupPinBufferAwareInputConnections = useCallback(
		(name: string) =>
			isPinBufferGroup && directionValue === 'input'
				? []
				: lookupInputConnections(name),
		[isPinBufferGroup, directionValue, lookupInputConnections]
	);

	const inputCards = useMemo(() => {
		const cards = buildSruSignalCards(
			inputs,
			'input',
			lookupPinBufferAwareInputConnections,
			filter
		);

		return isPinBufferGroup && directionValue === 'input'
			? cards.map(card => ({...card, editable: false}))
			: cards;
	}, [
		inputs,
		lookupPinBufferAwareInputConnections,
		filter,
		isPinBufferGroup,
		directionValue
	]);

	const directionControlCards = useMemo(
		() =>
			buildSruSignalCards(
				directionControls,
				'input',
				lookupInputConnections,
				filter
			),
		[directionControls, lookupInputConnections, filter]
	);

	const outputCards = useMemo(
		() =>
			buildSruSignalCards(
				signalGroup.outputs,
				'output',
				name => connectionsByOutput[name] ?? [],
				filter
			),
		[signalGroup.outputs, connectionsByOutput, filter]
	);

	const expandableSignals = useMemo(
		() =>
			[...inputCards, ...outputCards, ...directionControlCards]
				.filter(card => isSignalExpandable(card.connections))
				.map(card => card.signal.Name),
		[inputCards, outputCards, directionControlCards]
	);

	const allCardSignalNames = useMemo(
		() =>
			[...inputCards, ...outputCards, ...directionControlCards].map(
				card => card.signal.Name
			),
		[inputCards, outputCards, directionControlCards]
	);
	const aliases = useSruSignalAliasesFor(allCardSignalNames);

	const expandedCount = expandableSignals.filter(name =>
		expandedSignals.includes(name)
	).length;

	const hasCards =
		inputCards.length > 0 ||
		outputCards.length > 0 ||
		directionControlCards.length > 0;

	const inputHeading = isPinBufferGroup
		? l10n?.headings?.inputs?.label
		: l10n?.inputSignals;
	const outputHeading = isPinBufferGroup
		? l10n?.headings?.outputs?.label
		: l10n?.outputSignals;
	const inputTooltip = isPinBufferGroup
		? l10n?.headings?.inputs?.tooltip
		: undefined;
	const outputTooltip = isPinBufferGroup
		? l10n?.headings?.outputs?.tooltip
		: undefined;

	const handleDeleteConnection = useCallback(
		(entry: SruConnectionEntry) => {
			if (entry.status === 'default') {
				dispatch(disconnectSruConnectionWithUndo(entry.input));
			} else {
				dispatch(resetSruConnectionWithUndo(entry.input));
			}
		},
		[dispatch]
	);

	const handleEdit = useCallback(
		(card: SruSignalCard) => {
			if (card.direction === 'input') {
				dispatch(
					selectSruInput({
						peripheralName: signalGroup.peripheralName,
						input: card.signal
					})
				);
			} else {
				dispatch(
					selectSruOutput({
						peripheralName: signalGroup.peripheralName,
						output: card.signal
					})
				);
			}
		},
		[dispatch, signalGroup.peripheralName]
	);

	const handleToggle = useCallback(
		(signalName: string) => {
			dispatch(toggleSignalExpanded(signalName));
		},
		[dispatch]
	);

	const handleNavigateToSignal = useCallback(
		(signalName: string) => {
			dispatch(revealSruSignal(signalName));
		},
		[dispatch]
	);

	const handleDirectionChange = useCallback(
		(value: PinBufferDirection) => {
			if (!pbenSignal) return;

			const applyPinBufferInputConnections = () => {
				for (const input of inputs) {
					if (value === 'input') {
						dispatch(
							setSruConnection({
								input: input.Name,
								source: 'LOW'
							})
						);
					} else {
						dispatch(
							setSruConnection({
								input: input.Name,
								source: pinBufferInputRestoreByName[input.Name]
							})
						);
					}
				}
			};

			if (value === 'output') {
				dispatch(
					setSruConnection({
						input: pbenSignal.Name,
						source: 'HIGH'
					})
				);
				applyPinBufferInputConnections();
			} else if (value === 'input') {
				dispatch(
					setSruConnection({
						input: pbenSignal.Name,
						source: 'LOW'
					})
				);
				applyPinBufferInputConnections();
			} else if (bidirectionalRestoreSignal) {
				dispatch(
					setSruConnection({
						input: pbenSignal.Name,
						source: bidirectionalRestoreSignal
					})
				);
				applyPinBufferInputConnections();
			} else {
				dispatch(
					selectSruInput({
						peripheralName: signalGroup.peripheralName,
						input: pbenSignal
					})
				);
				applyPinBufferInputConnections();
			}
		},
		[
			bidirectionalRestoreSignal,
			dispatch,
			inputs,
			pbenSignal,
			pinBufferInputRestoreByName,
			signalGroup.peripheralName
		]
	);

	return (
		<div
			className={styles.container}
			data-test='signal-routing-unit-connections-panel'
		>
			<div className={styles.header}>
				<div className={styles.titles}>
					<h1>{signalGroup.name}</h1>
					<p className={styles.description}>
						{signalGroup.description}
					</p>
				</div>

				<SegmentedControls
					className={styles.actions}
					dataTest='signal-cards'
					options={[
						{
							key: 'expand-all',
							content: <ExpandAllIcon />,
							tooltip: l10n?.expandAll ?? '',
							ariaLabel: l10n?.expandAll ?? '',
							disabled:
								expandedCount === expandableSignals.length ||
								expandableSignals.length === 0,
							onClick() {
								dispatch(setExpandedSignals(expandableSignals));
							}
						},
						{
							key: 'collapse-all',
							content: <CollapseAllIcon />,
							tooltip: l10n?.collapseAll ?? '',
							ariaLabel: l10n?.collapseAll ?? '',
							disabled: expandedCount === 0,
							onClick() {
								dispatch(setExpandedSignals([]));
							}
						}
					]}
				/>
			</div>

			{isPinBufferGroup ? (
				<DirectionLocationRow
					directionLabel={l10n?.pinBufferControls?.directionLabel}
					directionOptions={[
						{
							value: 'input',
							label: l10n?.pinBufferControls?.directionOptions?.input
						},
						{
							value: 'output',
							label: l10n?.pinBufferControls?.directionOptions?.output
						},
						{
							value: 'bidirectional',
							label:
								l10n?.pinBufferControls?.directionOptions
									?.bidirectional
						}
					]}
					directionValue={directionValue}
					pinLocationLabel={l10n?.pinBufferControls?.pinLocationLabel}
					pinLocationValue={pinLocationValue}
					pinLocationUnassigned={
						l10n?.pinBufferControls?.pinLocationUnassigned
					}
					onDirectionChange={handleDirectionChange}
				/>
			) : null}

			<div className={styles.main}>
				{hasCards ? (
					<div className={styles.signals}>
						<SignalGroup
							key={`${signalGroup.key}:input`}
							dataTestKind='input'
							heading={inputHeading}
							tooltip={inputTooltip}
							cards={inputCards}
							expandedSignals={expandedSignals}
							focusedSignal={focusedSignalName}
							focusedSignalRef={focusedCardRef}
							selectionSequence={selectionSequence}
							aliases={aliases}
							onDeleteConnection={handleDeleteConnection}
							onEdit={handleEdit}
							onToggle={handleToggle}
							onNavigateToSignal={handleNavigateToSignal}
						/>
						<SignalGroup
							key={`${signalGroup.key}:output`}
							dataTestKind='output'
							heading={outputHeading}
							tooltip={outputTooltip}
							cards={outputCards}
							expandedSignals={expandedSignals}
							focusedSignal={focusedSignalName}
							focusedSignalRef={focusedCardRef}
							selectionSequence={selectionSequence}
							aliases={aliases}
							onDeleteConnection={handleDeleteConnection}
							onEdit={handleEdit}
							onToggle={handleToggle}
							onNavigateToSignal={handleNavigateToSignal}
						/>
						<SignalGroup
							key={`${signalGroup.key}:directionControl`}
							dataTestKind='directionControl'
							heading={l10n?.headings?.directionControls?.label}
							tooltip={l10n?.headings?.directionControls?.tooltip}
							cards={directionControlCards}
							expandedSignals={expandedSignals}
							focusedSignal={focusedSignalName}
							focusedSignalRef={focusedCardRef}
							selectionSequence={selectionSequence}
							aliases={aliases}
							onDeleteConnection={handleDeleteConnection}
							onEdit={handleEdit}
							onToggle={handleToggle}
							onNavigateToSignal={handleNavigateToSignal}
						/>
					</div>
				) : (
					<EmptyState
						dataTest='signal-cards-empty'
						title={l10n?.noMatchingSignals?.title}
						description={l10n?.noMatchingSignals?.description}
					/>
				)}
			</div>
		</div>
	);
}
