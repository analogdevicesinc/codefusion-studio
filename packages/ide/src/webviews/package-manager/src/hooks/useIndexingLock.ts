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

import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useIndexingRemotes} from '../state/slices/remotes/remotes.selector';

/**
 * While custom remotes are being indexed, actions that need the package
 * manager (install, uninstall, remote changes) are unavailable: indexing
 * holds it for long stretches.
 * @returns why those actions are unavailable (empty without a localized
 * string), or undefined when they are available
 */
export function useIndexingLock(): string | undefined {
	const remotes = useIndexingRemotes();
	const l10n = useLocaleContext()?.indexing;

	if (remotes.length === 0) {
		return undefined;
	}

	return (
		l10n?.unavailable?.replace('{remotes}', remotes.join(', ')) ?? ''
	);
}
