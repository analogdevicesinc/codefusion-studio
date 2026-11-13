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

import {Badge, Button, TextArea, Tooltip} from 'cfs-react-library';
import DeleteIcon from '@common/icons/Delete';
import {
	type TLocaleContext,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import {
	USER_DESCRIPTION_MAX_LENGTH,
	SignalSummary
} from './connection-details-shell';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import styles from './selected-inputs-list.module.scss';
import {useState} from 'react';
import DownArrow from '@common/icons/DownArrow';
import {
	getSruSignal,
	getSruSignalPeripheral
} from '../../../../utils/sru';
import {getSruConnectionStatus} from '../../../../state/slices/sru/sru.selector';
import type {SruConnectionStatus} from '../../../../state/slices/sru/sru.reducer';
import {AliasedSignalName} from '../../common/aliased-signal-name';

type SelectedInputsListProps = {
	readonly inputNames: readonly string[];
	readonly outputName: string;
	readonly defaultConnections: Readonly<Record<string, string>>;
	readonly signalInversions: Readonly<Record<string, boolean>>;
	readonly signalAliases: Readonly<Record<string, string>>;
	readonly onDelete: (name: string) => void;
	readonly getDescription: (name: string) => string;
	readonly onDescriptionChange: (name: string, value: string) => void;
};

/**
 * Flat list of input signals staged for routing from an SRU output. Each row
 * shows the signal's raw name (with its alias stacked underneath, if any), a
 * Default/Modified badge, and a delete control, and can be expanded to show
 * the signal summary and an editable description. Aliases are read-only
 * here - they can only be edited from that signal's own panel.
 *
 * The badge follows the same {@link getSruConnectionStatus} rule as the
 * routing table and signal cards, so an input whose routing is at its SoC
 * default but whose polarity inversion is enabled still reads as Modified.
 */
export function SelectedInputsList({
	inputNames,
	outputName,
	defaultConnections,
	signalInversions,
	signalAliases,
	onDelete,
	getDescription,
	onDescriptionChange
}: SelectedInputsListProps) {
	if (inputNames.length === 0) {
		return null;
	}

	return (
		<div className={styles.list}>
			{inputNames.map((name, index) => {
				const isDefault = defaultConnections[name] === outputName;
				const status = getSruConnectionStatus(
					!isDefault,
					Boolean(signalInversions[name])
				);

				return (
					<SelectedInputRow
						key={name}
						name={name}
						alias={signalAliases[name]}
						isLastItem={index === inputNames.length - 1}
						status={status}
						isAlreadyDisconnected={isDefault && outputName === 'LOW'}
						description={getDescription(name)}
						onDelete={onDelete}
						onDescriptionChange={onDescriptionChange}
					/>
				);
			})}
		</div>
	);
}

function SelectedInputRow({
	name,
	alias,
	isLastItem,
	status,
	isAlreadyDisconnected,
	onDelete,
	description,
	onDescriptionChange
}: Readonly<{
	name: string;
	alias?: string;
	status: SruConnectionStatus;
	isAlreadyDisconnected: boolean;
	isLastItem: boolean;
	onDelete: (name: string) => void;
	description: string;
	onDescriptionChange: (name: string, value: string) => void;
}>) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.signalRoutingUnit;
	const routingL10n = l10n?.routing;
	const detailsL10n = useConnectionDetailsL10n();
	const [isOpen, setIsOpen] = useState(false);
	const socDescription = getSruSignal(name)?.Description;

	const toggleDropdown = () => {
		setIsOpen(!isOpen);
	};

	return (
		<div
			className={`${isLastItem ? '' : styles.bottomBorder}`}
			data-test={`connection-details-input:${name}`}
		>
			<div className={styles.row}>
				<div className={styles.rowTop}>
					<div className={styles.nameWrapper}>
						<AliasedSignalName
							className={styles.name}
							name={name}
							alias={alias}
						/>

						{status === 'default' ? (
							<Badge appearance='secondary'>
								{routingL10n?.default}
							</Badge>
						) : (
							<Badge appearance='active'>
								{routingL10n?.modified}
							</Badge>
						)}
					</div>

					<div className={styles.controlsWrapper}>
						<Tooltip
							title={
								isAlreadyDisconnected
									? detailsL10n?.alreadyDisconnected
									: routingL10n?.removeConnection
							}
							type='short'
							position='bottom'
						>
							<Button
								appearance='icon'
								className={styles.deleteButton}
								dataTest={`connection-details-input:${name}:delete-button`}
								disabled={isAlreadyDisconnected}
								onClick={() => {
									onDelete(name);
								}}
							>
								<DeleteIcon />
							</Button>
						</Tooltip>

						<Tooltip
							type='short'
							title={isOpen ? l10n?.collapse : l10n?.expand}
						>
							<Button
								appearance='icon'
								className={`${styles.chevron} ${
									isOpen ? styles.open : ''
								}`}
								dataTest={`connection-details-input:${name}:expand-button`}
								onClick={toggleDropdown}
							>
								<DownArrow />
							</Button>
						</Tooltip>
					</div>
				</div>
			</div>

			{isOpen && (
				<div className={styles.signalDetails}>
					<SignalSummary
						peripheralName={getSruSignalPeripheral(name)}
						signalType={getSruSignal(name)?.SignalType}
						description={socDescription}
					/>

					<div className={styles.descriptionWrapper}>
						<div className={styles.descriptionLabel}>
							<span>{detailsL10n?.description}</span>
							<span className={styles.optional}>
								{detailsL10n?.optional}
							</span>
						</div>
						<TextArea
							value={description}
							placeholder={detailsL10n?.descriptionPlaceholder}
							maxlength={USER_DESCRIPTION_MAX_LENGTH}
							dataTest={`connection-details-input:${name}:description`}
							onInputChange={value => {
								onDescriptionChange(name, value);
							}}
						/>
						<span
							className={styles.counter}
							data-test={`connection-details-input:${name}:description-counter`}
						>
							{description.length}/{USER_DESCRIPTION_MAX_LENGTH}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
