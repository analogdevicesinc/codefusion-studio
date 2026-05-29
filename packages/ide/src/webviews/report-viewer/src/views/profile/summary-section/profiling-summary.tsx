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
import styles from './profiling-summary.module.scss';
import type {
	AIModelProfileReport,
	HardwareMetrics,
	MemoryAnalysis,
	ProfilingModelSummary
} from '@ide-types/report-view-types';
import {useReport} from '../../../report';
import {Button, WarningIcon} from 'cfs-react-library';
import {useState} from 'react';
import DownArrow from '../../../../../common/icons/DownArrow';
import {ProfilingMemoryView} from './profiling-memory-view';
import {formatToFixedOrFirstSignificant} from '../../../../../common/utils/string';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';

export function ProfilingSummary({
	setRecommendationsExpanded
}: {
	readonly setRecommendationsExpanded: (expanded: boolean) => void;
}) {
	const report = useReport<AIModelProfileReport>();
	const l10n = useLocaleContext();

	const [expanded, setExpanded] = useState(true);

	const recommendationsAvailable =
		report.memory_analysis?.memory_recommendations?.length > 0 ||
		report.optimization_opportunities?.layerwise_opportunities
			?.length > 0 ||
		report.optimization_opportunities?.macs_opportunities?.length > 0;

	return (
		<div
			className={styles.container}
			data-test='profile-summary-section'
		>
			<div className={styles.header}>
				<h3>{l10n?.profiling.summary.title}</h3>
				<Button
					appearance='icon'
					dataTest='summary-expand-button'
					className={`${styles.expandButton} ${expanded ? '' : styles.collapsed}`}
					onClick={() => {
						setExpanded(!expanded);
					}}
				>
					<DownArrow />
				</Button>
			</div>
			{expanded && (
				<div className={styles.body}>
					{recommendationsAvailable && (
						<div className={styles.recommendationBanner}>
							<span className={styles.recommendationText}>
								<WarningIcon />
								{l10n?.profiling.summary.recommendationsAvailable}
							</span>
							<Button
								className={styles.viewRecommendationsButton}
								appearance='secondary'
								onClick={() => {
									setRecommendationsExpanded(true);
								}}
							>
								{l10n?.profiling.viewMemoryRecommendations}
							</Button>
						</div>
					)}
					<section className={styles.content}>
						<ModelInfo modelSummary={report.model_summary} />
						<HardwareInfo
							hardwareMetrics={report.hardware_metrics}
							memoryAnalysis={report.memory_analysis}
							modelSummary={report.model_summary}
						/>
					</section>
				</div>
			)}
		</div>
	);
}

function ModelInfo({
	modelSummary
}: {
	readonly modelSummary: ProfilingModelSummary;
}) {
	const l10n = useLocaleContext()?.profiling?.tableDetail;

	return (
		<div className={styles.modelInfoContainer}>
			<InfoItem label={l10n?.model} value={modelSummary.model_name} />
			<InfoItem
				label={l10n?.modelPath}
				value={modelSummary.model_path}
			/>
			<InfoItem
				label={l10n?.framework}
				value={modelSummary.framework}
			/>
			<InfoItem
				label={l10n?.modelSize}
				value={`${formatToFixedOrFirstSignificant(
					modelSummary.model_size_kb
				)} KB`}
			/>
			<InfoItem
				label={l10n?.dataType}
				value={modelSummary.target_dtype}
			/>
			<InfoItem
				label={l10n?.layerCount}
				value={modelSummary.layer_count}
			/>
		</div>
	);
}

function HardwareInfo({
	hardwareMetrics,
	memoryAnalysis,
	modelSummary
}: {
	readonly hardwareMetrics: HardwareMetrics;
	readonly memoryAnalysis: MemoryAnalysis;
	readonly modelSummary: ProfilingModelSummary;
}) {
	const l10n = useLocaleContext()?.profiling?.tableDetail;

	return (
		<div className={styles.hardwareInfoContainer}>
			<div className={styles.hardwareInfoItems}>
				<InfoItem
					label={l10n?.cycles}
					value={hardwareMetrics.total_cycles}
				/>
				<InfoItem
					label={l10n?.latency}
					value={`${formatToFixedOrFirstSignificant(
						hardwareMetrics.estimated_latency_ms
					)} ms`}
				/>
				<InfoItem
					label={l10n?.layers}
					value={`${hardwareMetrics.accelerated_layers}/${modelSummary.layer_count} ${l10n?.accelerated}`}
				/>
			</div>

			<ProfilingMemoryView
				availableMemoryKb={memoryAnalysis.available_ram_kb}
				modelMemoryKb={modelSummary.model_size_kb}
				runTimeMemoryKb={memoryAnalysis.model_peak_ram_kb}
			/>
		</div>
	);
}

function InfoItem(props: {
	readonly label: string;
	readonly value: string | number;
}) {
	return (
		<div className={styles.infoItem}>
			<h6 className={styles.label}>{props.label}</h6>
			<span className={styles.value} title={props.value.toString()}>
				{props.value}
			</span>
		</div>
	);
}
