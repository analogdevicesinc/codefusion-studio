/**
 *
 * Copyright (c) 2024, 2026 Analog Devices, Inc. All Rights Reserved.
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

import type {StorybookConfig} from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: [
		'../src/**/*.mdx',
		'../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
	],
	addons: [
		'@storybook/addon-onboarding',
		'@storybook/addon-links',
		'@storybook/addon-docs',
		'@chromatic-com/storybook'
	],
	framework: {
		name: '@storybook/react-vite',
		options: {}
	}
};
export default config;
