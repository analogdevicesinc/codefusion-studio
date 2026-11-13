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

import {useMemo, type PropsWithChildren} from 'react';
import useVsCodeTheme from '@common/hooks/use-vs-code-theme';
import {ColorsContext, type SevColors} from './colors-context';

/** Supplies the current VS Code palette to the UI */
export function ColorsProvider({children}: PropsWithChildren) {
	const theme = useVsCodeTheme();

	const colors = useMemo((): SevColors => {
		const styles = getComputedStyle(document.documentElement);
		const getStyle = (token: string) =>
			styles.getPropertyValue(token).trim();

		return {
			borderColor: getStyle('--vscode-commandCenter-inactiveBorder'),
			dotColor: getStyle('--vscode-button-background'),
			hoverDotColor: getStyle('--vscode-button-background'),
			editorWidgetBackground: getStyle(
				'--vscode-editorWidget-background'
			),
			editorWidgetColor: getStyle('--vscode-editorWidget-border'),
			editorWidgetForeground: getStyle(
				'--vscode-editorWidget-foreground'
			),
			descriptionForeground: getStyle(
				'--vscode-descriptionForeground'
			),
			defaultForeground: getStyle('--vscode-editor-foreground')
		};
		// Theme changes invalidate the computed CSS values.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [theme]);

	return (
		<ColorsContext.Provider value={colors}>
			{children}
		</ColorsContext.Provider>
	);
}
