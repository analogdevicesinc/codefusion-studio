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

import {
	type CompatibilityUnsupportedTypeIssue,
	type CompatibilityOperatorIssue
} from "@ide-types/report-view-types";
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import styles from './layer-based-issue-details.module.scss';

type Props = {
	readonly issue:
		| CompatibilityOperatorIssue
		| CompatibilityUnsupportedTypeIssue;
};

export default function LayerBasedIssueDetails({issue}: Props) {
	const l10n = useLocaleContext();

	return (
		<>
			<div className={styles.info}>
				<h6 className={styles.title}>
					{l10n?.compatibility['affected-layers']}
				</h6>

				<p className={styles.detail}>{issue.layers.join(', ')}</p>
			</div>

			{'suggested_alternative' in issue && (
				<div className={styles.suggestion}>
					<h6 className={styles.title}>
						{l10n?.compatibility.operator['suggested-alternative']}:
					</h6>

					<p className={styles.text}>{issue.suggested_alternative}</p>
				</div>
			)}
		</>
	);
}
