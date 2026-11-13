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
import {useEffect, useMemo, useState, type RefObject} from 'react';
import {InfoIcon, Tooltip} from 'cfs-react-library';
import type {SruConnectionEntry} from '../../../../state/slices/sru/sru.selector';
import {
	groupSruSignalCardsByType,
	type SruSignalCard
} from '../../../../utils/sru-signals';
import {SignalTypeGroup} from './signal-type-group';
import styles from './signal-group.module.scss';

type SignalGroupProps = Readonly<{
	dataTestKind: 'input' | 'output' | 'directionControl';
	heading: string | undefined;
	tooltip?: string;
	cards: SruSignalCard[];
	expandedSignals: string[];
	focusedSignal?: string;
	focusedSignalRef?: RefObject<HTMLDivElement>;
	selectionSequence: number;
	/** User-assigned aliases for the group's signals, keyed by signal name. */
	aliases?: Readonly<Record<string, string>>;
	onDeleteConnection: (entry: SruConnectionEntry) => void;
	onEdit: (card: SruSignalCard) => void;
	onToggle: (signalName: string) => void;
	onNavigateToSignal: (signalName: string) => void;
}>;

/**
 * One section of the Connections main panel: a heading followed by the
 * section's signals, sub-grouped by their SoC-defined `SignalType` (e.g.
 * "Clock Signals", "Data Signals"). Renders nothing when the section has no
 * signals to show, which happens both for input-only or output-only
 * peripheral signal groups and when the active filter excludes them all.
 *
 * Each `SignalType` sub-group is collapsible and defaults to expanded. The
 * collapsed set is local to this component instance - callers key each
 * `SignalGroup` by peripheral signal group so switching peripherals resets
 * it rather than carrying a stale collapse state over. Focusing a signal
 * (e.g. from the routing table) expands its sub-group by clearing its
 * collapsed state, so revealing a signal never leaves it hidden inside a
 * collapsed sub-group - but the group can still be toggled afterwards like
 * any other, rather than being force-expanded for as long as focus holds.
 *
 * Heading text and optional info tooltip are resolved by the caller so this
 * component stays presentational and has no knowledge of pin-buffer vs
 * regular peripheral wording.
 *
 * `focusedSignalRef`, when provided, is attached to whichever card matches
 * `focusedSignal`, letting the caller scroll it into view via the DOM node
 * directly rather than querying for it by its (test-only) `data-test`
 * attribute.
 */
export function SignalGroup({
	dataTestKind,
	heading,
	tooltip,
	cards,
	expandedSignals,
	focusedSignal,
	focusedSignalRef,
	selectionSequence,
	aliases,
	onDeleteConnection,
	onEdit,
	onToggle,
	onNavigateToSignal
}: SignalGroupProps) {
	const [collapsedTypes, setCollapsedTypes] = useState<string[]>([]);

	const typeGroups = useMemo(
		() => groupSruSignalCardsByType(cards),
		[cards]
	);

	useEffect(() => {
		if (!focusedSignal) return;

		const focusedGroup = typeGroups.find(group =>
			group.cards.some(card => card.signal.Name === focusedSignal)
		);

		if (!focusedGroup) return;

		setCollapsedTypes(current =>
			current.filter(type => type !== focusedGroup.signalType)
		);
		// Keyed on `selectionSequence` rather than `focusedSignal` so
		// reselecting the same signal re-expands its sub-group after the user
		// has collapsed it - the name alone doesn't change value in that
		// case. Same rationale as the scroll-into-view effect in
		// PeripheralConnections.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectionSequence]);

	if (cards.length === 0) {
		return null;
	}

	const handleToggleType = (signalType: string) => {
		setCollapsedTypes(current =>
			current.includes(signalType)
				? current.filter(type => type !== signalType)
				: [...current, signalType]
		);
	};

	return (
		<div
			className={styles.container}
			data-test={`signal-group:${dataTestKind}`}
		>
			<div className={styles.headingRow}>
				<h2 className={styles.title}>{heading}</h2>
				{tooltip ? (
					<Tooltip title={tooltip} type='long' position='bottom'>
						<span className={styles.infoIcon}>
							<InfoIcon />
						</span>
					</Tooltip>
				) : null}
			</div>

			<div className={styles.signals}>
				{typeGroups.map(group => (
					<SignalTypeGroup
						key={group.signalType}
						dataTestKind={dataTestKind}
						signalType={group.signalType}
						cards={group.cards}
						isExpanded={!collapsedTypes.includes(group.signalType)}
						expandedSignals={expandedSignals}
						focusedSignal={focusedSignal}
						focusedSignalRef={focusedSignalRef}
						aliases={aliases}
						onToggle={handleToggleType}
						onDeleteConnection={onDeleteConnection}
						onEdit={onEdit}
						onToggleCard={onToggle}
						onNavigateToSignal={onNavigateToSignal}
					/>
				))}
			</div>
		</div>
	);
}
