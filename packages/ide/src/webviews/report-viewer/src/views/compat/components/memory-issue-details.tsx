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

import {ExternalLinkIcon} from 'cfs-react-library';
import { type CompatibilityMemoryIssue } from "@ide-types/report-view-types";
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import styles from './memory-issue-details.module.scss';

type Props = {
	readonly issue: CompatibilityMemoryIssue;
};

export default function MemoryIssueDetails({issue}: Props) {
	const l10n = useLocaleContext();

	return (
		<div className={styles.container}>
			<p className={styles.detailedInformation}>
				{issue.detailed_info}
			</p>

			<div className={styles.recommendations}>
				<h6 className={styles.title}>
					{l10n?.compatibility.memory['recommended-actions']}
				</h6>

				<ol className={styles.recommendationsList}>
					{issue.recommendations.map(recommendation => (
						<div key={recommendation.method} className={styles.item}>
							<p className={styles.method}>{recommendation.method}</p>
							{recommendation.reference && (
								<a
									href={recommendation.reference}
									className={styles.reference}
								>
									{l10n?.compatibility.memory.reference}
									<ExternalLinkIcon />
								</a>
							)}
						</div>
					))}
				</ol>
			</div>
		</div>
	);
}
