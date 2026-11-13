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
import {localizeWithArgs} from '@common/utils/string';
import {useWestEditor} from '../contexts/WestEditorContext';
import RemoteCard from './RemoteCard';
import styles from './RemotesSection.module.scss';

/** The hosts the manifest resolves projects against, one card each. */
export default function RemotesSection() {
	const l10n = useLocaleContext();
	const {manifest} = useWestEditor();

	if (!manifest) return null;

	const remotes = manifest.remotes ?? [];

	return (
		<section className={styles.section}>
			<h2
				className={styles.count}
				data-test='west-editor:remotes-count'
			>
				{remotes.length === 1
					? l10n?.remotes.countOne
					: localizeWithArgs(l10n, 'remotes.count', {
							count: remotes.length
						})}
			</h2>
			{remotes.length === 0 ? (
				<p className={styles.empty}>{l10n?.remotes.empty}</p>
			) : (
				<div className={styles.list}>
					{remotes.map((remote, index) => (
						<RemoteCard
							// eslint-disable-next-line react/no-array-index-key
							key={`remote-${index}`}
							name={remote.name}
							url={remote['url-base']}
							index={index}
							onCopyUrl={() => {
								void navigator.clipboard.writeText(
									remote['url-base']
								);
							}}
						/>
					))}
				</div>
			)}
		</section>
	);
}
