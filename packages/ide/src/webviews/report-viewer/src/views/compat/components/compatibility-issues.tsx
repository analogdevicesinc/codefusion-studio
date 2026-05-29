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

import {Accordion, Badge} from 'cfs-react-library';
import {
	isMemoryIssue,
	isOperatorIssue,
	isUnsupportedTypeIssue,
	type CompatibilityIssue
} from '@ide-types/report-view-types';
import styles from './compatibility-issues.module.scss';
import DownArrow from '../../../../../common/icons/DownArrow';
import {useState} from 'react';
import {type TLocaleContext} from '../../../../../common/types/l10n';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import MemoryIssueDetails from './memory-issue-details';
import LayerBasedIssueDetails from './layer-based-issue-details';

type CompatibilityIssuesProps = {
	readonly issues: CompatibilityIssue[] | undefined;
	readonly title: string;
	readonly noIssuesMessage: string;
	readonly dataTest?: string;
};

export default function CompatibilityIssues({
	issues,
	title,
	noIssuesMessage,
	dataTest
}: CompatibilityIssuesProps) {
	if (!issues) {
		issues = [];
	}

	return (
		<section
			className={`${styles.section} ${issues.length === 0 ? styles.empty : ''}`}
			data-test={dataTest}
		>
			<h2 className={styles.heading}>
				{title}
				<span>({issues.length})</span>
			</h2>

			{issues.length === 0 ? (
				<p
					className={styles.noIssues}
					data-test={`${dataTest}-no-issues`}
				>
					{noIssuesMessage}
				</p>
			) : (
				<ol
					className={styles.issuesList}
					data-test={`${dataTest}-list`}
				>
					{issues.map((issue, index) => (
						// Using index is ok here because issues are static and won't change
						// eslint-disable-next-line react/no-array-index-key
						<CompatibilityIssueListItem key={index} issue={issue} />
					))}
				</ol>
			)}
		</section>
	);
}

type CompatibilityIssueListItemProps = {
	readonly issue: CompatibilityIssue;
};

function CompatibilityIssueListItem({
	issue
}: CompatibilityIssueListItemProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const handleCollapseToggle = () => {
		setIsExpanded(prevIsExpaned => !prevIsExpaned);
	};

	return (
		<li>
			<Accordion
				open={isExpanded}
				title={<CompatibilityIssueListItemTitle issue={issue} />}
				onToggle={handleCollapseToggle}
			>
				{isExpanded && isMemoryIssue(issue) && (
					<MemoryIssueDetails issue={issue} />
				)}

				{isExpanded &&
					(isOperatorIssue(issue) ||
						isUnsupportedTypeIssue(issue)) && (
						<LayerBasedIssueDetails issue={issue} />
					)}
			</Accordion>
		</li>
	);
}

type CompatibilityIssueListItemTitleProps = {
	readonly issue: CompatibilityIssue;
};

function CompatibilityIssueListItemTitle({
	issue
}: CompatibilityIssueListItemTitleProps) {
	const l10n = useLocaleContext();
	const issueTitle = getIssueTitle(l10n, issue);

	return (
		<div className={styles.issueItemHeader}>
			<h3 className={styles.title}>
				{issueTitle}

				<Badge appearance='secondary' className={styles.severity}>
					{l10n?.compatibility.severity[issue.severity]}
				</Badge>
			</h3>
		</div>
	);
}

const memoryIssueTranslationKeys: Record<string, string> = {
	model_storage_memory_overflow: 'memory-overflow',
	model_storage_flash_overflow: 'flash-overflow',
	model_storage_ram_overflow: 'ram-overflow'
};

function getIssueTitle(
	l10n: TLocaleContext | undefined,
	issue: CompatibilityIssue
): string {
	if (isMemoryIssue(issue)) {
		return l10n?.compatibility.memory.issues[
			memoryIssueTranslationKeys[issue.type]
		];
	}

	if (isOperatorIssue(issue)) {
		return issue.operator;
	}

	if (isUnsupportedTypeIssue(issue)) {
		return `${issue.operation_type} ${l10n?.compatibility.type['operation-uses']} ${issue.data_type}`;
	}

	return 'unknown-issue';
}
