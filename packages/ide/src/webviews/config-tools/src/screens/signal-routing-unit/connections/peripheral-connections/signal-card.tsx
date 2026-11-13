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
import {forwardRef} from 'react';
import {
	Badge,
	Button,
	Card,
	SruDirectionControlIcon,
	SruInputIcon,
	SruOutputIcon,
	Tooltip
} from 'cfs-react-library';
import DownArrow from '@common/icons/DownArrow';
import DeleteIcon from '@common/icons/Delete';
import ConfigIcon16px from '@common/icons/Config16px';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {localizeMessage} from '@common/utils/localization';
import type {SruConnectionEntry} from '../../../../state/slices/sru/sru.selector';
import {canRevealSruSignal} from '../../../../utils/sru';
import {
	isSignalExpandable,
	type SruSignalCard
} from '../../../../utils/sru-signals';
import {AliasedSignalName} from '../../common/aliased-signal-name';
import styles from './signal-card.module.scss';

type SignalCardProps = Readonly<{
	card: SruSignalCard;
	isExpanded: boolean;
	focusedSignal?: string;
	signalAlias?: string;
	onDeleteConnection: (entry: SruConnectionEntry) => void;
	onEdit: (card: SruSignalCard) => void;
	onToggle: (signalName: string) => void;
	onNavigateToSignal: (signalName: string) => void;
}>;

/**
 * Collapsible card for a single SRU signal. The header names the signal and
 * how many connections it takes part in; expanding it lists those
 * connections. Unused outputs have nothing to reveal, so they render without
 * a chevron and cannot be expanded.
 *
 * Forwards its ref to the underlying `Card` element so callers (e.g. to
 * scroll the focused card into view) can reach the DOM node directly,
 * without relying on the `data-test` attribute, which is meant for tests.
 */
export const SignalCard = forwardRef<HTMLDivElement, SignalCardProps>(
	(
		{
			card,
			isExpanded,
			focusedSignal,
			signalAlias,
			onDeleteConnection,
			onEdit,
			onToggle,
			onNavigateToSignal
		},
		ref
	) => {
		const l10n: TLocaleContext | undefined =
			useLocaleContext()?.signalRoutingUnit;
		const connectionsL10n: TLocaleContext | undefined =
			l10n?.connections;

		const {signal, direction, connections} = card;
		const isExpandable = isSignalExpandable(connections);
		const name = signal.Name;
		const isFocused = focusedSignal === name;

		const countLabel = isExpandable
			? localizeMessage(
					connectionsL10n,
					`connectionCount.${
						connections.length === 1 ? 'one' : 'other'
					}`,
					{count: String(connections.length)}
				)
			: connectionsL10n?.unused;

		const toggle = () => {
			onToggle(name);
		};

		return (
			<Card
				ref={ref}
				isActive={isFocused}
				isExpanded={isExpanded}
				disableHoverEffects={!isExpandable}
				testId={`signal-card:${name}`}
			>
				<div className={styles.card}>
					<div
						className={`${styles.header} ${
							isExpandable ? styles.expandable : ''
						}`}
						onClick={isExpandable ? toggle : undefined}
					>
						<div className={styles.name}>
							<span className={styles.directionIcon}>
								<DirectionIcon card={card} />
							</span>
							<h3 title={signal.Description}>
								<AliasedSignalName name={name} alias={signalAlias} />
							</h3>
						</div>

						<div className={styles.meta}>
							<span
								className={styles.count}
								data-test={`signal-card:${name}:count`}
							>
								{countLabel}
							</span>
							{card.editable && (
								<Tooltip
									title={connectionsL10n?.configure}
									type='short'
									position='bottom'
								>
									<Button
										appearance='icon'
										className={styles.editButton}
										dataTest={`signal-card:${name}:edit-button`}
										onClick={event => {
											event.stopPropagation();
											onEdit(card);
										}}
									>
										<ConfigIcon16px />
									</Button>
								</Tooltip>
							)}
							{isExpandable && (
								<Tooltip
									title={isExpanded ? l10n?.collapse : l10n?.expand}
									type='short'
									position='bottom'
								>
									<Button
										appearance='icon'
										className={`${styles.chevron} ${
											isExpanded ? styles.chevronOpen : ''
										}`}
										dataTest={`signal-card:${name}:chevron`}
									>
										<DownArrow />
									</Button>
								</Tooltip>
							)}
						</div>
					</div>

					{isExpanded && isExpandable && (
						<div
							className={styles.body}
							data-test={`signal-card:${name}:body`}
						>
							{connections.map(entry => (
								<ConnectionRow
									key={entry.input}
									entry={entry}
									direction={direction}
									onDelete={onDeleteConnection}
									onNavigate={onNavigateToSignal}
								/>
							))}
						</div>
					)}
				</div>
			</Card>
		);
	}
);

/**
 * Renders a single connection the card's signal takes part in: the signal at
 * the other end of it, plus whether that connection is the SoC default or a
 * user override.
 */
function ConnectionRow({
	entry,
	direction,
	onDelete,
	onNavigate
}: Readonly<{
	entry: SruConnectionEntry;
	direction: 'input' | 'output';
	onDelete: (entry: SruConnectionEntry) => void;
	onNavigate: (signalName: string) => void;
}>) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit;
	const routingL10n = l10n?.routing;
	const detailsL10n = l10n?.connections?.connectionDetails;
	const isDefaultConnection = entry.status === 'default';
	// A default connection can be deleted (the input falls back to LOW) —
	// except when its default already IS LOW, since there's nothing left
	// to disconnect in that case.
	const isAlreadyDisconnected =
		isDefaultConnection && entry.output === 'LOW';

	// An input card lists the output it is sourced from; an output card lists
	// the inputs sourced from it.
	const counterpart =
		direction === 'input' ? entry.output : entry.input;
	const counterpartAlias =
		direction === 'input' ? entry.outputAlias : entry.inputAlias;
	const CounterpartIcon =
		direction === 'input' ? SruOutputIcon : SruInputIcon;
	const isNavigable = canRevealSruSignal(counterpart);

	return (
		<div
			className={styles.row}
			data-test={`signal-connection:${counterpart}`}
		>
			<span className={styles.rowIcon}>
				<CounterpartIcon width={16} height={16} />
			</span>
			<AliasedSignalName
				name={counterpart}
				alias={
					counterpartAlias?.length
						? `- ${counterpartAlias}`
						: undefined
				}
				className={styles.rowName}
				onNameClick={
					isNavigable
						? () => {
								onNavigate(counterpart);
							}
						: undefined
				}
			/>
			<div className={styles.rowActions}>
				{isDefaultConnection ? (
					<Badge
						className={styles.connectionRowBadge}
						appearance='secondary'
					>
						{routingL10n?.default}
					</Badge>
				) : (
					<Badge
						className={styles.connectionRowBadge}
						appearance='active'
					>
						{routingL10n?.modified}
					</Badge>
				)}
				{direction === 'output' && (
					<Tooltip
						title={
							isAlreadyDisconnected
								? detailsL10n?.alreadyDisconnected
								: isDefaultConnection
									? routingL10n?.removeConnection
									: routingL10n?.resetSource
						}
						type='short'
						position='bottom'
					>
						<Button
							appearance='icon'
							className={styles.deleteButton}
							dataTest={`signal-connection:${counterpart}:delete-button`}
							disabled={isAlreadyDisconnected}
							onClick={() => {
								onDelete(entry);
							}}
						>
							<DeleteIcon />
						</Button>
					</Tooltip>
				)}
			</div>
			{entry.description && (
				<p
					className={styles.rowDescription}
					data-test={`signal-connection:${counterpart}:description`}
				>
					{entry.description}
				</p>
			)}
		</div>
	);
}

function DirectionIcon({card}: Readonly<{card: SruSignalCard}>) {
	if (card.direction === 'output') {
		return <SruOutputIcon width={24} height={24} />;
	}

	return card.signal.IsPinBufferEnable ? (
		<SruDirectionControlIcon width={24} height={24} />
	) : (
		<SruInputIcon width={24} height={24} />
	);
}
