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
import type {RefObject} from 'react';
import DownArrow from '@common/icons/DownArrow';
import type {SruConnectionEntry} from '../../../../state/slices/sru/sru.selector';
import type {SruSignalCard} from '../../../../utils/sru-signals';
import {SignalCard} from './signal-card';
import styles from './signal-type-group.module.scss';

type SignalTypeGroupProps = Readonly<{
	dataTestKind: 'input' | 'output' | 'directionControl';
	signalType: string;
	cards: SruSignalCard[];
	isExpanded: boolean;
	expandedSignals: string[];
	focusedSignal?: string;
	focusedSignalRef?: RefObject<HTMLDivElement>;
	/** User-assigned aliases for the group's signals, keyed by signal name. */
	aliases?: Readonly<Record<string, string>>;
	onToggle: (signalType: string) => void;
	onDeleteConnection: (entry: SruConnectionEntry) => void;
	onEdit: (card: SruSignalCard) => void;
	onToggleCard: (signalName: string) => void;
	onNavigateToSignal: (signalName: string) => void;
}>;

/**
 * One `SignalType` sub-group within a `SignalGroup` section: a collapsible
 * heading naming the SoC-defined signal type (e.g. "Clock Signals"),
 * followed by a card per signal of that type. Collapsing is purely a display
 * preference owned by the caller - this component only renders the current
 * `isExpanded` value and reports toggle clicks.
 */
export function SignalTypeGroup({
	dataTestKind,
	signalType,
	cards,
	isExpanded,
	expandedSignals,
	focusedSignal,
	focusedSignalRef,
	aliases,
	onToggle,
	onDeleteConnection,
	onEdit,
	onToggleCard,
	onNavigateToSignal
}: SignalTypeGroupProps) {
	return (
		<div
			className={styles.container}
			data-test={`signal-type-group:${dataTestKind}:${signalType}`}
		>
			<button
				type='button'
				className={styles.heading}
				aria-expanded={isExpanded}
				onClick={() => {
					onToggle(signalType);
				}}
			>
				<span className={styles.title}>{signalType}</span>
				<span
					className={`${styles.chevron} ${
						isExpanded ? styles.chevronOpen : ''
					}`}
				>
					<DownArrow />
				</span>
			</button>

			{isExpanded ? (
				<div
					role='group'
					aria-label={signalType}
					className={styles.signals}
				>
					{cards.map(card => (
						<SignalCard
							key={card.signal.Name}
							ref={
								card.signal.Name === focusedSignal
									? focusedSignalRef
									: undefined
							}
							card={card}
							isExpanded={expandedSignals.includes(card.signal.Name)}
							focusedSignal={focusedSignal}
							signalAlias={aliases?.[card.signal.Name]}
							onDeleteConnection={onDeleteConnection}
							onEdit={onEdit}
							onToggle={onToggleCard}
							onNavigateToSignal={onNavigateToSignal}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}
