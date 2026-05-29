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
import styles from './recommendation-section.module.scss';
import type {
	AIModelProfileReport,
	OptimizationOpportunityEntry
} from "@ide-types/report-view-types";
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {SidePanel} from '../../../common/side-panel';

export type RecommendationSectionProps = {
	readonly isOpen: boolean;
	readonly onClose?: () => void;
	readonly setActiveSqlQuery: (query: string) => void;
	readonly report: AIModelProfileReport;
};

export function RecommendationSection({
	isOpen: isExpanded,
	onClose,
	setActiveSqlQuery,
	report
}: RecommendationSectionProps) {
	const l10n = useLocaleContext();

	const recommendations =
		report.memory_analysis.memory_recommendations;

	return (
		<SidePanel
			title={l10n?.profiling.recommendations}
			isOpen={isExpanded}
			className={styles.sidePanel}
			onClose={onClose}
		>
			<div className={styles.recommendationsContainer}>
				<section className={styles.section}>
					<h5>{l10n?.profiling.sidepanel.memoryRecommendations}</h5>
					{recommendations.length === 0 && (
						<p>{l10n?.profiling.sidepanel.noRecommendations}</p>
					)}
					{recommendations.map(recommendation => (
						<p key={recommendation}>{recommendation}</p>
					))}
				</section>
				<section className={styles.section}>
					<h5>{l10n?.profiling.sidepanel.layerOpportunities}</h5>
					{report.optimization_opportunities.layerwise_opportunities
						.length === 0 && (
						<p>{l10n?.profiling.sidepanel.noRecommendations}</p>
					)}
					{report.optimization_opportunities.layerwise_opportunities.map(
						opportunity => (
							<LayerOpportunityItem
								key={`${opportunity.layer_index}-${opportunity.suggestion}`}
								opportunity={opportunity}
								setActiveSqlQuery={setActiveSqlQuery}
							/>
						)
					)}
				</section>
				<section className={styles.section}>
					<h5>{l10n?.profiling.sidepanel.macsOpportunities}</h5>
					{report.optimization_opportunities.macs_opportunities
						.length === 0 && (
						<p>{l10n?.profiling.sidepanel.noRecommendations}</p>
					)}
					{report.optimization_opportunities.macs_opportunities.map(
						opportunity => (
							<LayerOpportunityItem
								key={`${opportunity.layer_index}-${opportunity.suggestion}`}
								opportunity={opportunity}
								setActiveSqlQuery={setActiveSqlQuery}
							/>
						)
					)}
				</section>
			</div>
		</SidePanel>
	);
}

function LayerOpportunityItem({
	opportunity,
	setActiveSqlQuery
}: {
	readonly opportunity: OptimizationOpportunityEntry;
	readonly setActiveSqlQuery: (query: string) => void;
}) {
	const l10n = useLocaleContext();

	return (
		<p key={opportunity.layer_index}>
			<a
				href='layer'
				onClick={() => {
					setActiveSqlQuery(
						'Select * Where layer_idx=' + opportunity.layer_index
					);
				}}
			>
				{l10n?.profiling.sidepanel.layer} {opportunity.layer_index}
			</a>{' '}
			({opportunity.op_type}) : {opportunity.suggestion}
		</p>
	);
}
