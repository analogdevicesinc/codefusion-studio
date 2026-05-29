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
import styles from './layer-row-detail.module.scss';
import type { OptimizationOpportunityEntry } from "@ide-types/report-view-types";
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {useMemo} from 'react';

export type LayerRowDetailData = {
	layerOpportunities: OptimizationOpportunityEntry[];
	macsOpportunities: OptimizationOpportunityEntry[];
};

export type LayerRowDetailProps = {
	readonly layerIdx: number;
	readonly columns: number;
	readonly data?: LayerRowDetailData;
};

export function LayerRowDetail({
	layerIdx,
	columns,
	data
}: LayerRowDetailProps) {
	const l10n = useLocaleContext();

	const {inputShape, bias} = useMemo(() => {
		const kernelInfo =
			data?.layerOpportunities?.[0]?.kernel_info ??
			data?.macsOpportunities?.[0]?.kernel_info;

		if (!kernelInfo) {
			return {inputShape: 'N/A', bias: 'N/A'};
		}

		const [inputShape, bias]: number[][] = JSON.parse(kernelInfo);

		return {
			inputShape: `[${inputShape.join(', ')}]`,
			bias: `[${bias.join(', ')}]`
		};
	}, [data]);

	return (
		<div
			className={styles.container}
			style={{gridColumn: `span ${columns}`}}
		>
			{data?.layerOpportunities?.map(opportunity => (
				<div key={opportunity.suggestion} className={styles.bodyB2}>
					{l10n?.profiling.tableDetail.layerRecommendations} :{' '}
					{opportunity.suggestion}
				</div>
			))}
			{data?.macsOpportunities?.map(opportunity => (
				<div key={opportunity.suggestion} className={styles.bodyB2}>
					{l10n?.profiling.tableDetail.macRecommendations} :{' '}
					{opportunity.suggestion}
				</div>
			))}
			<div className={styles.kernelInfo}>
				<span className={styles.bodyB2}>
					{l10n?.profiling.tableDetail.inputShape} : {inputShape}
				</span>
				<span className={styles.bodyB2}>
					{l10n?.profiling.tableDetail.bias} : {bias}
				</span>
			</div>
		</div>
	);
}
