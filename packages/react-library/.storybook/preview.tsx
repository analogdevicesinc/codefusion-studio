/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc. All Rights Reserved.
 * This software is proprietary to Analog Devices, Inc. and its licensors.
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

import type {Preview, Decorator} from '@storybook/react';
import '../src/styles/tokens.css';
import '../src/styles/vscode-default-themes.css';
import React, {CSSProperties} from 'react';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	}
};

export const globalTypes = {
	theme: {
		name: 'Theme',
		description: 'Global theme for components',
		defaultValue: 'light',
		toolbar: {
			// The icon for the toolbar item
			icon: 'circlehollow',
			// Array of options
			items: [
				{value: 'light', icon: 'circlehollow', title: 'light'},
				{value: 'dark', icon: 'circle', title: 'dark'},
				{value: 'red', icon: 'alert', title: 'red'},
				{
					value: 'side-by-side',
					icon: 'sidebar',
					title: 'side by side'
				}
			],
			// Property that specifies if the name of the item will be displayed
			showName: true
		}
	}
};

interface ThemeBlockProps {
	theme: 'light' | 'dark' | 'red';
	fill?: boolean;
	children: React.ReactNode;
	left?: boolean;
}

const ThemeBlock: React.FC<ThemeBlockProps> = ({
	theme,
	fill,
	children,
	left
}): JSX.Element => {
	const themeClass =
		theme === 'red'
			? 'red'
			: theme === 'dark'
				? 'dark-plus'
				: 'light-plus';
	const style: CSSProperties = {
		boxSizing: 'border-box',
		position: 'absolute',
		top: 0,
		left: left || fill ? 0 : '50vw',
		borderRight: left ? '1px solid #202020' : 'none',
		right: left ? '50vw' : 0,
		width: fill ? '100vw' : '50vw',
		height: '100vh',
		bottom: 0,
		overflow: 'auto',
		padding: '1rem',
		background: 'var(--vscode-editor-background)'
	};
	return (
		<div style={style} className={themeClass}>
			{children}
		</div>
	);
};

const withTheme: Decorator = (Story, context) => {
	const theme = context.globals?.theme;
	if (theme === 'side-by-side') {
		return (
			<>
				<ThemeBlock theme='light' left={true}>
					<Story />
				</ThemeBlock>
				<ThemeBlock theme='dark'>
					<Story />
				</ThemeBlock>
			</>
		);
	}
	return (
		<ThemeBlock fill={true} theme={theme}>
			<Story />
		</ThemeBlock>
	);
};

export const decorators = [withTheme];
export default preview;
