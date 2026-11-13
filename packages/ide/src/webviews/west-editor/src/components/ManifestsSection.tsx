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
import {InlineMessage} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useMessenger} from '@common/contexts/MessengerContext';
import {westEditorOpenManifestRequest} from '@west-editor/messages';
import {localizeWithArgs} from '@common/utils/string';
import {useWestEditor} from '../contexts/WestEditorContext';
import {useManifestImports} from '../hooks/useManifestImports';
import ManifestCard from './ManifestCard';
import styles from './ManifestsSection.module.scss';

/**
 * The manifests the open manifest imports, one card each: those of the
 * manifest repository itself (`self.import`) first, then each project's.
 */
export default function ManifestsSection() {
	const l10n = useLocaleContext();
	const {manifest} = useWestEditor();
	const {imports, error} = useManifestImports(manifest);
	const messenger = useMessenger();

	const openManifest = (absolutePath: string) => {
		messenger
			.sendRequest(
				westEditorOpenManifestRequest,
				{type: 'extension'},
				absolutePath
			)
			.catch(() => {
				// The host has already logged the failure in the Output Channel
			});
	};

	// A project import outside a west workspace cannot be located, so it
	// gets no handler and the card disables its open button.
	const openHandler = (absolutePath: string | undefined) =>
		absolutePath === undefined
			? undefined
			: () => {
					openManifest(absolutePath);
				};

	if (!manifest) return null;

	if (error) {
		return (
			<section className={styles.section}>
				<InlineMessage
					type='error'
					dataTest='west-editor:manifests-error'
				>
					{l10n?.manifests.error} {error}
				</InlineMessage>
			</section>
		);
	}

	// The first response is still on its way; later ones keep the previous
	// list on screen until they land, so the cards do not flicker.
	if (!imports) return null;

	return (
		<section className={styles.section}>
			<h2
				className={styles.count}
				data-test='west-editor:manifests-count'
			>
				{imports.length === 1
					? l10n?.manifests.countOne
					: localizeWithArgs(l10n, 'manifests.count', {
							count: imports.length
						})}
			</h2>
			{imports.length === 0 ? (
				<p className={styles.empty}>{l10n?.manifests.empty}</p>
			) : (
				<div className={styles.list}>
					{imports.map((entry, index) => (
						<ManifestCard
							// eslint-disable-next-line react/no-array-index-key
							key={`manifest-${index}`}
							path={entry.path}
							projectName={entry.projectName ?? l10n?.manifests.self}
							index={index}
							onOpen={openHandler(entry.absolutePath)}
						/>
					))}
				</div>
			)}
		</section>
	);
}
