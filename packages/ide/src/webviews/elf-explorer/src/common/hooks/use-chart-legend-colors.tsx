/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {useMemo} from 'react';
import useVsCodeTheme from '../../../../common/hooks/use-vs-code-theme';
import {getComputedStyleValue} from '../../utils/chart-utils';

type ChartLegendColors = {
	text: string;
	data: string;
	bss: string;
};

const COLOR_DEFS: Array<[keyof ChartLegendColors, string, string]> = [
	['text', '--vscode-charts-blue', '#3794ff'],
	['data', '--vscode-charts-green', '#89d185'],
	['bss', '--vscode-charts-orange', '#d18616']
];

export function useChartLegendColors(): ChartLegendColors {
	const theme = useVsCodeTheme();

	return useMemo(() => {
		const colors: ChartLegendColors = {
			text: '#3794ff',
			data: '#89d185',
			bss: '#d18616'
		};

		for (const [key, cssVar, fallback] of COLOR_DEFS) {
			const value =
				getComputedStyleValue(document.documentElement, cssVar) ||
				fallback;
			colors[key] = value;
		}

		return colors;

		// This execution needs to be triggered on theme change,
		// but theme value is not being used directly for the calculation.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [theme]);
}
