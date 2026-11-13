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
import styles from './profiling-report.module.scss';
import type {LayerReport} from '@ide-types/report-view-types';
import {useReport} from '../../report';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import {ProfilingSummary} from './summary-section/profiling-summary';
import {ModelLayersSection} from './layers-section/model-layers-section';
import {useState} from 'react';
import {RecommendationSection} from './sidepanels/recommendation-section';

export function ProfilingReport() {
	const report = useReport<LayerReport>();
	const l10n = useLocaleContext();

	const [recommendationsExpanded, setRecommendationsExpanded] =
		useState(false);

	const [activeSqlQuery, setActiveSqlQuery] = useState('Select *');

	if (!report) return;

	return (
		<div className={styles.sidePanelContainer}>
			<div className={styles.container}>
				<div className={styles.titleRow}>
					<h1>
						{report.type === 'profile'
							? `${l10n?.profiling.title}: ${report.model_summary?.model_name ?? ''}`
							: `${l10n?.runtimeProfiling.title}`}
					</h1>
				</div>
				<ProfilingSummary
					setRecommendationsExpanded={setRecommendationsExpanded}
				/>
				<ModelLayersSection
					reportOptimizations={
						report.type === 'profile'
							? (report.optimization_opportunities ?? undefined)
							: undefined
					}
					activeSqlQuery={activeSqlQuery}
					setActiveSqlQuery={setActiveSqlQuery}
				/>
			</div>
			{report.type === 'profile' && (
				<RecommendationSection
					isOpen={recommendationsExpanded}
					report={report}
					setActiveSqlQuery={setActiveSqlQuery}
					onClose={() => {
						setRecommendationsExpanded(false);
					}}
				/>
			)}
		</div>
	);
}
