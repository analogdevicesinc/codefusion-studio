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

import {type AIModelCompatReport} from '@ide-types/report-view-types';
import {useReport} from '../../report';
import styles from './compatibility-report.module.scss';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import CompatibilityIssues from './components/compatibility-issues';

export function CompatibilityReport() {
	const l10n = useLocaleContext();
	const report = useReport<AIModelCompatReport>();

	if (!report) {
		return <div>{l10n?.errors['report-load-error']}</div>;
	}

	return (
		<div>
			<div
				className={styles.container}
				data-test='compatibility-report'
			>
				<main className={styles.main}>
					<h1 className={styles.heading}>
						{l10n?.compatibility.title}:{' '}
						{report.model_summary?.model_name}
					</h1>

					<CompatibilityIssues
						issues={report.memory_issues}
						title={l10n?.compatibility.memory.title}
						noIssuesMessage={l10n?.compatibility.memory['no-issues']}
						dataTest='memory-issues'
					/>

					<CompatibilityIssues
						issues={report.operator_issues}
						title={l10n?.compatibility.operator.title}
						noIssuesMessage={
							l10n?.compatibility.operator['no-issues']
						}
						dataTest='operator-issues'
					/>

					<CompatibilityIssues
						issues={report.unsupported_types}
						title={l10n?.compatibility.type.title}
						noIssuesMessage={l10n?.compatibility.type['no-issues']}
						dataTest='unsupported-types'
					/>
				</main>
			</div>
		</div>
	);
}
