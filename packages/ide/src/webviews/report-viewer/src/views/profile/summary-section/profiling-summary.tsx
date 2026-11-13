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
	CfsAiProfilingHardwareMetrics,
	CfsAiProfilingMemoryAnalysis,
	CfsAiProfilingModelSummary,
	CfsAiRuntimeHardwareMetrics,
	CfsAiRuntimeInferenceSummary,
	CfsAiRuntimeModelSummary
} from 'cfs-types';
import type {LayerReport} from '@ide-types/report-view-types';
import {useReport} from '../../../report';
import {Button, WarningIcon} from 'cfs-react-library';
import {useState} from 'react';
import DownArrow from '../../../../../common/icons/DownArrow';
import {ProfilingMemoryView} from './profiling-memory-view';
import {formatToFixedOrFirstSignificant} from '../../../../../common/utils/string';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {ModelHashButton} from '../../../common/model-hash-button';
import {InfoItem} from '../../../common/info-item';

export function ProfilingSummary({
	setRecommendationsExpanded
}: {
	readonly setRecommendationsExpanded: (expanded: boolean) => void;
}) {
	const report = useReport<LayerReport>();
	const l10n = useLocaleContext();

	const [expanded, setExpanded] = useState(true);

	const isProfile = report.type === 'profile';

	const recommendationsAvailable =
		isProfile &&
		(!!report.memory_analysis?.memory_recommendations.length ||
			!!report.optimization_opportunities?.layerwise_opportunities
				.length ||
			!!report.optimization_opportunities?.macs_opportunities.length);

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
					className={`${styles.expandButton} ${
						expanded ? '' : styles.collapsed
					}`}
					onClick={() => {
						setExpanded(!expanded);
					}}
				>
					<DownArrow />
				</Button>
			</div>
			{expanded && (
				<div className={styles.body}>
					{isProfile && recommendationsAvailable && (
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
						{isProfile ? (
							<StaticProfileModelInfo
								modelSummary={report.model_summary}
							/>
						) : (
							<RuntimeProfileModelInfo
								modelSummary={report.model_summary}
							/>
						)}
						{isProfile ? (
							<ProfileHardwareInfo
								hardwareMetrics={report.hardware_metrics}
								memoryAnalysis={report.memory_analysis}
								modelSummary={report.model_summary}
							/>
						) : (
							<RuntimeHardwareInfo
								hardwareMetrics={report.hardware_metrics}
								inferenceSummary={report.inference_summary}
								modelSummary={report.model_summary}
							/>
						)}
					</section>
				</div>
			)}
		</div>
	);
}

function StaticProfileModelInfo({
	modelSummary
}: {
	readonly modelSummary: CfsAiProfilingModelSummary | null;
}) {
	const locale = useLocaleContext();
	const l10n = locale?.profiling?.tableDetail;
	const notAvailable: string = locale?.common.notAvailable;

	return (
		<div className={styles.modelInfoContainer}>
			<InfoItem
				label={l10n?.model}
				value={modelSummary?.model_path ?? notAvailable}
				truncationSide='left'
				dataTest='model-path-value'
			/>
			{modelSummary?.model_hash && (
				<InfoItem
					label={l10n?.modelHash}
					value={modelSummary.model_hash}
					truncationSide='left'
					dataTest='model-hash-value'
					action={<ModelHashButton hash={modelSummary.model_hash} />}
				/>
			)}
			<InfoItem
				label={l10n?.framework}
				value={modelSummary?.framework ?? notAvailable}
			/>
			<InfoItem
				label={l10n?.modelSize}
				value={formatOptionalNumber(
					modelSummary?.model_size_kb,
					notAvailable,
					' KB'
				)}
			/>
			<InfoItem
				label={l10n?.dataType}
				value={modelSummary?.target_dtype ?? notAvailable}
			/>
			<InfoItem
				label={l10n?.layerCount}
				value={modelSummary?.layer_count ?? notAvailable}
			/>
		</div>
	);
}

function RuntimeProfileModelInfo({
	modelSummary
}: {
	readonly modelSummary: CfsAiRuntimeModelSummary;
}) {
	const l10n = useLocaleContext()?.profiling?.tableDetail;

	return (
		<div
			className={`${styles.modelInfoContainer} ${styles.runtimeModelInfo}`}
		>
			<InfoItem label={l10n?.model} value={modelSummary.model_name} />
			<InfoItem
				label={l10n?.modelPath}
				value={modelSummary.model_path}
				truncationSide='left'
				dataTest='model-path-value'
			/>
			<InfoItem
				label={l10n?.framework}
				value={modelSummary.framework}
			/>
			<InfoItem
				label={l10n?.layerCount}
				value={modelSummary.layer_count}
			/>
		</div>
	);
}

function ProfileHardwareInfo({
	hardwareMetrics,
	memoryAnalysis,
	modelSummary
}: {
	readonly hardwareMetrics: CfsAiProfilingHardwareMetrics | null;
	readonly memoryAnalysis: CfsAiProfilingMemoryAnalysis | null;
	readonly modelSummary: CfsAiProfilingModelSummary | null;
}) {
	const locale = useLocaleContext();
	const l10n = locale?.profiling;
	const notAvailable: string = locale?.common.notAvailable;

	return (
		<div className={styles.hardwareInfoContainer}>
			<div className={styles.hardwareInfoItems}>
				<InfoItem
					label={l10n?.tableDetail.cycles}
					value={hardwareMetrics?.total_cycles ?? notAvailable}
				/>
				<InfoItem
					label={l10n?.tableDetail.latency}
					value={formatOptionalNumber(
						hardwareMetrics?.estimated_latency_ms,
						notAvailable,
						' ms'
					)}
				/>
				<InfoItem
					label={l10n?.tableDetail.layers}
					value={`${hardwareMetrics?.accelerated_layers ?? notAvailable}/${modelSummary?.layer_count ?? notAvailable} ${l10n?.tableDetail.accelerated}`}
				/>
			</div>
			<ProfilingMemoryView
				availableMemoryKb={memoryAnalysis?.available_ram_kb ?? null}
				modelMemoryKb={modelSummary?.model_size_kb ?? null}
				runTimeMemoryKb={memoryAnalysis?.model_peak_ram_kb ?? null}
				title={l10n?.estimatedRunTimePerformance}
			/>
		</div>
	);
}

function RuntimeHardwareInfo({
	hardwareMetrics,
	inferenceSummary,
	modelSummary
}: {
	readonly hardwareMetrics: CfsAiRuntimeHardwareMetrics;
	readonly inferenceSummary: CfsAiRuntimeInferenceSummary;
	readonly modelSummary: CfsAiRuntimeModelSummary;
}) {
	const l10n = useLocaleContext()?.runtimeProfiling;

	return (
		<div className={styles.hardwareInfoContainer}>
			<div className={styles.hardwareInfoItems}>
				<InfoItem
					label={l10n?.tableDetail.avgLatency}
					value={`${formatToFixedOrFirstSignificant(
						inferenceSummary.avg_latency_ms
					)} ms`}
				/>
				<InfoItem
					label={l10n?.tableDetail.throughput}
					value={`${formatToFixedOrFirstSignificant(
						inferenceSummary.throughput_ips
					)} inf/s`}
				/>
				<InfoItem
					label={l10n?.tableDetail.iterations}
					value={inferenceSummary.iterations}
				/>
				<InfoItem
					label={l10n?.tableDetail.layers}
					value={`${hardwareMetrics.accelerated_layers}/${modelSummary.layer_count} ${l10n?.tableDetail.accelerated}`}
				/>
			</div>

			<ProfilingMemoryView
				availableMemoryKb={hardwareMetrics.available_ram_kb}
				modelMemoryKb={0}
				runTimeMemoryKb={hardwareMetrics.peak_memory_kb}
				title={l10n?.memoryView.title}
				hasModelMemory={false}
			/>
		</div>
	);
}

/**
 * Formats a number that may be missing from the report, falling back to
 * the given placeholder.
 */
function formatOptionalNumber(
	value: number | null | undefined,
	fallback: string,
	unit = ''
): string {
	return value === null || value === undefined
		? fallback
		: `${formatToFixedOrFirstSignificant(value)}${unit}`;
}
