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

import {
	Badge,
	DataGrid,
	DataGridCell,
	DataGridRow,
	DropDown,
	Radio
} from 'cfs-react-library';
import type {
	ModelData,
	ModelSupportedPlatform
} from '../../types/model-zoo-data';
import {getLocalization} from '../../utils/localization';
import styles from './CfsModelSummaryCard.module.scss';
import {useEffect, useMemo, useState} from 'react';
import {filterZooModelPlatforms} from './model-zoo-utils';
import CfsSelectionCard from '../cfs-selection-card/CfsSelectionCard';

export type CfsModelSummaryCardProps = Readonly<{
	model: ModelData;
	highlightClassName?: string;
	filters?: {
		socs: string[];
		cores: string[];
	};
	selected: boolean;
	selectedQuantization?: string;
	setSelected: (quantization: string) => void;
}>;

function formatModelSize(
	sizeInKb: number | undefined
): string | undefined {
	const l10n = getLocalization('model-zoo');

	if (sizeInKb === undefined) {
		return l10n?.summary?.details?.unknownSize;
	}

	if (sizeInKb >= 1024) {
		return `${(sizeInKb / 1024).toFixed(2)} ${
			l10n?.summary?.details?.mbUnit
		}`;
	}

	return `${sizeInKb.toFixed(2)} ${l10n?.summary?.details?.kbUnit}`;
}

/**
 * Renders a compact, high-signal view of a model with primary metadata and actions.
 */
export function CfsModelSummaryCard({
	model,
	filters,
	highlightClassName,
	selected,
	selectedQuantization,
	setSelected
}: CfsModelSummaryCardProps) {
	const l10n = getLocalization('model-zoo');

	const filteredPlatforms = useMemo(
		() => filterZooModelPlatforms(filters ?? {}, model),
		[filters, model]
	);

	const defaultQuantization =
		filteredPlatforms[0]?.compilation?.quantization?.default ?? '';

	const [dropdownValue, setDropdownValue] = useState(
		selectedQuantization ?? defaultQuantization
	);

	useEffect(() => {
		if (selectedQuantization !== undefined) {
			setDropdownValue(selectedQuantization);
		}
	}, [selectedQuantization]);

	const quantizations = useMemo(() => {
		const availableQuantizations = new Set<string>(
			model.supportedPlatforms.flatMap(
				platform => platform.compilation?.quantization?.values ?? []
			)
		);

		return [...availableQuantizations].sort((left, right) =>
			left.localeCompare(right)
		);
	}, [model.supportedPlatforms]);

	const id = `zoo-model-${model.uniqueId}`;

	return (
		<CfsSelectionCard
			id={id}
			testId={`model-summary-${model.uniqueId}`}
			alwaysShowContent={false}
			isChecked={selected}
			onChange={() => {
				setSelected(dropdownValue);
			}}
		>
			<Radio slot='start' checked={selected} />
			<h3
				className={`${styles.title} ${highlightClassName ?? ''}`}
				slot='title'
			>
				{model.displayName ?? model.name}
			</h3>
			<div className={styles.header} slot='end'>
				<div className={styles.badges}>
					<Badge appearance='secondary'>
						<span className={highlightClassName}>{model.task}</span>
					</Badge>
					<Badge appearance='secondary'>
						<span className={highlightClassName}>
							{model.taskType}
						</span>
					</Badge>
					<Badge appearance='secondary'>
						<span className={highlightClassName}>
							{model.framework}
						</span>
					</Badge>
				</div>
				<div className={styles.endSlot}>
					<DropDown
						controlId={`quantization-${model.uniqueId}`}
						currentControlValue={dropdownValue}
						options={quantizations.map(q => ({value: q, label: q}))}
						size='small'
						dataTest={`quantization-${model.uniqueId}`}
						onHandleDropdown={value => {
							setDropdownValue(value);
							setSelected(value);
						}}
					/>
				</div>
			</div>
			<article className={styles.container} slot='content'>
				<section className={styles.descriptionSection}>
					<p className={styles.description}>{model.description}</p>
				</section>
				<div className={styles.detailsContent}>
					<section className={styles.summaryPane}>
						<h4 className={styles.detailsHeader}>
							{l10n?.summary?.details?.title}
						</h4>
						<DetailsGrid model={model} />
					</section>
					<section className={styles.summaryPane}>
						<h4 className={styles.detailsHeader}>
							{l10n?.summary?.quantization?.title}
						</h4>
						<QuantizationTable
							supportedPlatforms={model.supportedPlatforms}
							filteredPlatforms={filteredPlatforms}
							quantizations={quantizations}
						/>
					</section>
				</div>
			</article>
		</CfsSelectionCard>
	);
}

function DetailsGrid({model}: {readonly model: ModelData}) {
	const l10n = getLocalization('model-zoo');

	return (
		<div className={styles.detailsGrid}>
			<div className={styles.detailsCell}>
				<span className={styles.detailsLabel}>
					{l10n?.summary?.details?.ownerLabel}
				</span>
				<span className={styles.detailsValue}>
					{model.owner ?? l10n?.summary?.details?.noneLabel}
				</span>
			</div>
			<div className={styles.detailsCell}>
				<span className={styles.detailsLabel}>
					{l10n?.summary?.details?.licenseLabel}
				</span>
				<span className={styles.detailsValue}>{model.license}</span>
			</div>
			<div className={`${styles.detailsCell}`}>
				<span className={styles.detailsLabel}>
					{l10n?.summary?.accuracy?.title}
				</span>
				<div className={styles.detailsValue}>
					{model.accuracy?.dataset && (
						<span>{model.accuracy.dataset}</span>
					)}
					{model.accuracy?.metrics?.map(metric => (
						<span key={metric.name}>
							{metric.name}: {String(metric.value)}
						</span>
					))}
					{!model.accuracy && l10n?.summary?.accuracy?.noMetrics}
				</div>
			</div>
			<div className={styles.detailsCell}>
				<span className={styles.detailsLabel}>
					{l10n?.summary?.io?.title}
				</span>
				<div className={styles.detailsValue}>
					{model.networkInputs?.map(input => (
						<span key={input.name} title={input.description}>
							{l10n?.summary?.io?.inputLabel} {input.name} [
							{input.shape}]
						</span>
					))}
					{model.networkOutputs?.map(output => (
						<span key={output.name} title={output.description}>
							{l10n?.summary?.io?.outputLabel} {output.name} [
							{output.shape}]
						</span>
					))}
					{!model.networkInputs?.length &&
						!model.networkOutputs?.length &&
						l10n?.summary?.io?.none}
				</div>
			</div>
		</div>
	);
}

function getPlatformId(platform: ModelSupportedPlatform): string {
	return `${platform.soc}|${platform.board}|${platform.core}|${
		platform.package ?? ''
	}|${platform.accelerator ?? ''}`;
}

function QuantizationTable({
	supportedPlatforms,
	filteredPlatforms,
	quantizations
}: {
	readonly supportedPlatforms: readonly ModelSupportedPlatform[];
	readonly filteredPlatforms: ModelSupportedPlatform[];
	readonly quantizations: string[];
}) {
	const l10n = getLocalization('model-zoo');

	const filteredPlatformIds = useMemo(
		() => new Set(filteredPlatforms.map(getPlatformId)),
		[filteredPlatforms]
	);

	if (supportedPlatforms.length === 0 || quantizations.length === 0) {
		return null;
	}

	const columnTemplate = `1fr ${quantizations
		.map(() => 'auto')
		.join(' ')}`;

	return (
		<div
			className={styles.quantizationTableWrapper}
			// Workaround because the DataGrid does not work correctly with auto layout
			style={
				{
					'--quantization-grid-columns': columnTemplate
				} as React.CSSProperties
			}
		>
			<DataGrid>
				<DataGridRow rowType='header'>
					<DataGridCell cellType='columnheader' gridColumn='1'>
						{l10n?.summary?.quantization?.platformHeader}
					</DataGridCell>
					{quantizations.map((quantization, index) => (
						<DataGridCell
							key={quantization}
							cellType='columnheader'
							gridColumn={String(index + 2)}
						>
							{quantization}
						</DataGridCell>
					))}
				</DataGridRow>
				{supportedPlatforms.map(platform => {
					const platformId = getPlatformId(platform);
					const isInFilteredSet =
						filteredPlatformIds.size === 0 ||
						filteredPlatformIds.has(platformId);
					const defaultQuantization =
						platform.compilation?.quantization?.default;
					const supportedQuantizationValues =
						platform.compilation?.quantization?.values ?? [];

					return (
						<DataGridRow
							key={platformId}
							className={
								isInFilteredSet ? '' : styles.platformRowInactive
							}
						>
							<DataGridCell cellType='rowheader' gridColumn='1'>
								{platform.board} ({platform.soc}/{platform.core})
							</DataGridCell>
							{quantizations.map((quantization, index) => {
								const isSupported =
									supportedQuantizationValues.includes(quantization);

								if (!isSupported) {
									return (
										<DataGridCell
											key={`${platformId}-${quantization}`}
											gridColumn={String(index + 2)}
										>
											{l10n?.summary?.quantization?.unsupportedMarker}
										</DataGridCell>
									);
								}

								const quantizedModelSize =
									platform.sizeInKb?.[quantization];

								return (
									<DataGridCell
										key={`${platformId}-${quantization}`}
										gridColumn={String(index + 2)}
										className={
											defaultQuantization === quantization
												? styles.defaultQuantizationCell
												: ''
										}
									>
										{formatModelSize(quantizedModelSize)}
									</DataGridCell>
								);
							})}
						</DataGridRow>
					);
				})}
			</DataGrid>
		</div>
	);
}
