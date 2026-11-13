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

import type {ReactNode} from 'react';
import {mount} from 'cypress/react';
import {Provider} from 'react-redux';
import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {MessengerProvider} from '../../../common/contexts/MessengerContext';
import {store} from '../state/store';
import '../tokens.css';
import '../../../../../../react-library/src/styles/index.scss';

// Localization is read off a global at provider render, so every spec needs it
// loaded. Doing it here keeps the depth-sensitive path in one place.
const l10n = await import('../../../../../l10n/bundle.l10n.en.json');
(
	window as unknown as Record<string, unknown>
).__webview_localization_resources__ = l10n.default;

/**
 * Mounts a package-manager view the way the real webview does.
 *
 * The app shell is a full-height flex column (`height: 100%`, `overflow:
 * hidden`), which production satisfies through `html, body { height: 100vh }`
 * and `#root { height: 100% }` in the react-library stylesheet. Cypress mounts
 * into `[data-cy-root]` instead, which those rules do not reach — without a
 * sized wrapper the shell collapses to zero height and every assertion fails
 * on clipped content rather than on the behaviour under test.
 */
export function mountPackageManager(component: ReactNode) {
	return mount(
		<div style={{height: '100vh', width: '100%'}}>{component}</div>
	);
}

/**
 * Mounts a single component with the providers `app.tsx` normally supplies, for
 * specs that exercise one component rather than a whole flow.
 *
 * The store is the webview's module-level singleton, so dispatch `resetStore()`
 * in `beforeEach` exactly as the app-level specs do.
 */
export function mountPackageManagerComponent(component: ReactNode) {
	return mountPackageManager(
		<MessengerProvider>
			<Provider store={store}>
				<LocalizationProvider namespace='packman'>
					{component}
				</LocalizationProvider>
			</Provider>
		</MessengerProvider>
	);
}
