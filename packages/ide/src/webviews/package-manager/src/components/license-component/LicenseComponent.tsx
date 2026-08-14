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
import {ProgressRing} from 'cfs-react-library';
import styles from './license-component.module.scss';
import {stripTrailingUrlPunctuation, URL_REGEX} from '../../utils';

function renderLicenseContentWithLinks(
	content: string
): React.ReactNode[] {
	const nodes: React.ReactNode[] = [];
	let cursor = 0;

	for (const match of content.matchAll(URL_REGEX)) {
		const rawMatch = match[0];
		const startIndex = match.index;

		if (startIndex === undefined) {
			continue;
		}

		if (startIndex > cursor) {
			nodes.push(content.slice(cursor, startIndex));
		}

		const url = stripTrailingUrlPunctuation(rawMatch);
		const trailing = rawMatch.slice(url.length);

		nodes.push(
			<a
				key={`${url}-${startIndex}`}
				className={styles.urlLink}
				href={url}
				target='_blank'
				rel='noopener noreferrer'
			>
				{url}
			</a>
		);

		if (trailing) {
			nodes.push(trailing);
		}

		cursor = startIndex + rawMatch.length;
	}

	if (cursor < content.length) {
		nodes.push(content.slice(cursor));
	}

	return nodes.length > 0 ? nodes : [content];
}

type LicenseComponentProps = {
	readonly title: string;
	readonly name: string;
	readonly target: string;
	readonly licenseContent: string;
	/** When true, the license text area shows a loading indicator. */
	readonly isLoading: boolean;
};

export default function LicenseComponent({
	title,
	name,
	target,
	licenseContent,
	isLoading
}: LicenseComponentProps) {
	const l10n = useLocaleContext()?.license;

	return (
		<div className={styles.licenseDescription}>
			<div className={styles.licenseHeader}>
				<span className={styles.licenseHeaderText}>{title}</span>
			</div>
			<div className={styles.licenseBody}>
				<div className={styles.licenseHeader}>
					<div className={styles.nameAndTarget}>
						<div className={styles.name}>{name}</div>
						<div className={styles.target}>
							<span className={styles.targetText}>
								{l10n?.appliesTo}
							</span>
							<span className={styles.targetValue}>{target}</span>
						</div>
					</div>
				</div>
				{isLoading ? (
					<div className={styles.licenseLoading}>
						<ProgressRing />
					</div>
				) : (
					<div className={styles.licenseContent}>
						{renderLicenseContentWithLinks(licenseContent)}
					</div>
				)}
			</div>
		</div>
	);
}
