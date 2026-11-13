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

import {useMemo, useState} from 'react';
import {SearchableSelect, TextArea} from 'cfs-react-library';
import type {SruInputSignal} from 'cfs-types';
import ConfigSection from '../../../../components/config-panel/config-section/ConfigSection';
import {useAppDispatch} from '../../../../state/store';
import {
	setSruConnection,
	setSignalAlias,
	setSignalInversion,
	setUserDescription
} from '../../../../state/slices/sru/sru.reducer';
import {
	useSruEffectiveSource,
	useSruSignalAlias,
	useSruSignalAliasesFor,
	useSruSignalInversion,
	useSruUserDescription
} from '../../../../state/slices/sru/sru.selector';
import {
	getSruSelectableOutputs,
	supportsSruInversion
} from '../../../../utils/sru';
import {formatAliasedOptionLabel} from '../../common/aliased-signal-label';
import {AliasField} from './alias-field';
import {PolarityField} from './polarity-field';
import {
	ConnectionDetailsShell,
	USER_DESCRIPTION_MAX_LENGTH,
	DetailsField,
	SignalSummary
} from './connection-details-shell';
import {useConnectionDetailsL10n} from './use-connection-details-l10n';
import styles from './input-connection-details.module.scss';

type InputConnectionDetailsProps = {
	readonly input: SruInputSignal;
	readonly peripheralName: string;
};

/**
 * Connection details for an SRU input signal: the source is a searchable
 * select over the outputs the input can legally be routed to, the destination
 * is the input itself.
 *
 * Staged state is seeded once on mount, so the panel must be remounted (via a
 * `key`) when the edited signal changes.
 */
export function InputConnectionDetails({
	input,
	peripheralName
}: InputConnectionDetailsProps) {
	const dispatch = useAppDispatch();
	const detailsL10n = useConnectionDetailsL10n();
	const inputName = input.Name;
	const effectiveSource = useSruEffectiveSource(inputName);
	const [stagedOutput, setStagedOutput] = useState<
		string | undefined
	>(() => effectiveSource);

	const currentDescription = useSruUserDescription(inputName);
	const [stagedDescription, setStagedDescription] = useState(
		currentDescription ?? ''
	);

	const currentAlias = useSruSignalAlias(inputName);
	const [stagedAlias, setStagedAlias] = useState(currentAlias ?? '');

	const currentInverted = useSruSignalInversion(inputName);
	const [stagedInverted, setStagedInverted] =
		useState(currentInverted);

	const selectableOutputNames = useMemo(
		() => getSruSelectableOutputs(inputName),
		[inputName]
	);
	const outputAliases = useSruSignalAliasesFor(selectableOutputNames);
	const outputOptions = useMemo(
		() =>
			selectableOutputNames.map(name => ({
				label: formatAliasedOptionLabel(name, outputAliases[name]),
				value: name
			})),
		[selectableOutputNames, outputAliases]
	);

	return (
		<ConnectionDetailsShell
			isDirty={
				stagedOutput !== effectiveSource ||
				stagedDescription !== (currentDescription ?? '') ||
				stagedAlias !== (currentAlias ?? '') ||
				stagedInverted !== currentInverted
			}
			onSave={() => {
				if (stagedOutput) {
					dispatch(
						setSruConnection({
							input: inputName,
							source: stagedOutput
						})
					);
				}

				if (stagedDescription !== (currentDescription ?? '')) {
					dispatch(
						setUserDescription({
							input: inputName,
							description: stagedDescription
						})
					);
				}

				if (stagedAlias !== (currentAlias ?? '')) {
					dispatch(
						setSignalAlias({
							signalName: inputName,
							alias: stagedAlias
						})
					);
				}

				if (stagedInverted !== currentInverted) {
					dispatch(
						setSignalInversion({
							input: inputName,
							inverted: stagedInverted
						})
					);
				}
			}}
		>
			<ConfigSection
				isExpanded
				title={detailsL10n?.sourceDetails}
				dataTest='connection-details:source-section'
				variant='noChevron'
			>
				<DetailsField label={detailsL10n?.outputSignal}>
					<SearchableSelect
						isSearchable
						variant='form'
						size='md'
						dataTest='connection-details-output-select'
						selectedValue={stagedOutput}
						placeholder={detailsL10n?.selectOutputSignal}
						options={outputOptions}
						searchPlaceholder={detailsL10n?.searchSignals}
						noResultsText={detailsL10n?.noSignalsFound}
						onSelection={option => {
							setStagedOutput(option.value);
						}}
					/>
				</DetailsField>
			</ConfigSection>
			<ConfigSection
				isExpanded
				title={detailsL10n?.destinationDetails}
				dataTest='connection-details:destination-section'
				variant='noChevron'
			>
				<SignalSummary
					signalName={inputName}
					description={input.Description}
					peripheralName={peripheralName}
					signalType={input.SignalType}
				>
					<AliasField value={stagedAlias} onChange={setStagedAlias} />
					{supportsSruInversion(inputName) && (
						<PolarityField
							value={stagedInverted}
							onChange={setStagedInverted}
						/>
					)}
				</SignalSummary>
			</ConfigSection>

			<ConfigSection isExpanded variant='noChevron'>
				<DetailsField label={detailsL10n?.description}>
					<TextArea
						value={stagedDescription}
						placeholder={detailsL10n?.descriptionPlaceholder}
						maxlength={USER_DESCRIPTION_MAX_LENGTH}
						dataTest='connection-details-comment'
						onInputChange={setStagedDescription}
					/>
					<span
						className={styles.counter}
						data-test='connection-details-comment-counter'
					>
						{stagedDescription.length}/{USER_DESCRIPTION_MAX_LENGTH}
					</span>
				</DetailsField>
			</ConfigSection>
		</ConnectionDetailsShell>
	);
}
