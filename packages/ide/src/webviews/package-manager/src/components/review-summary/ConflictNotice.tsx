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

import type {CfsPackageReference} from 'cfs-package-manager';
import {InlineMessage} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './conflict-notice.module.scss';

type ConflictNoticeProps = Readonly<{
	/**
	 * The selected packages that pull in the disputed dependency, so the list
	 * names things the user can actually change. Does not drive the card
	 * highlighting, that follows `conflictingPackage`. Empty when the failure
	 * was not a conflict.
	 */
	culprits: CfsPackageReference[];
	/** Why resolution failed, shown when the cause was not a conflict. */
	failure: string;
}>;

function format(
	template: string | undefined,
	values: Record<string, string>
): string {
	return Object.entries(values).reduce(
		(text, [key, value]) => text.split(`{${key}}`).join(value),
		template ?? ''
	);
}

export default function ConflictNotice({
	culprits,
	failure
}: ConflictNoticeProps) {
	const l10n = useLocaleContext()?.reviewSummary?.conflict as
		| Record<string, string>
		| undefined;

	// Resolution failed for a reason Conan did not describe as a conflict, so
	// report that rather than implying the selection is at fault.
	if (culprits.length === 0) {
		return (
			<InlineMessage type='error' dataTest='resolution-failure'>
				{format(l10n?.resolutionFailed, {error: failure})}
			</InlineMessage>
		);
	}

	return (
		<InlineMessage
			type='error'
			dataTest='conflict-notice'
			className={styles.conflictDiv}
		>
			<div className={styles.entry}>
				<span>{l10n?.cannotInstallTogether}</span>
				<br />
				<ul className={styles.culprits}>
					{culprits.map(culprit => (
						<li key={`${culprit.name}/${culprit.version}`}>
							{`${culprit.name}/${culprit.version}`}
						</li>
					))}
				</ul>
				<br />
				<span className={styles.message}>
					{l10n?.returnToSelection}
				</span>
			</div>
		</InlineMessage>
	);
}
