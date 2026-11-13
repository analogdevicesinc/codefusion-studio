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
	Button,
	Card,
	ExternalLinkIcon,
	TruncatedText
} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './ManifestCard.module.scss';

type ManifestCardProps = Readonly<{
	/** Imported manifest, relative to the workspace topdir. */
	path: string;
	/** Name of the project the manifest is imported from. */
	projectName: string;
	/** Position in the list, used for the test hooks. */
	index: number;
	/** Opens the manifest; the open button is disabled without one. */
	onOpen?: () => void;
}>;

/**
 * One imported manifest: the file west reads and the project it comes from.
 *
 * Read-only for now: the only action is opening the file, which is
 * reported to the caller.
 */
export default function ManifestCard({
	path,
	projectName,
	index,
	onOpen
}: ManifestCardProps) {
	const l10n = useLocaleContext();

	return (
		<Card
			disableHoverEffects
			testId={`west-editor:manifest-card-${index}`}
		>
			<div className={styles.card}>
				<div className={styles.file}>
					<div role='heading' aria-level={3} className={styles.path}>
						<TruncatedText
							side='left'
							title={path}
							dataTest={`west-editor:manifest-path-${index}`}
						>
							{path}
						</TruncatedText>
					</div>
					<Button
						appearance='icon'
						className={styles.iconButton}
						ariaLabel={l10n?.manifests.open}
						disabled={!onOpen}
						dataTest={`west-editor:manifest-open-${index}`}
						onClick={onOpen}
					>
						<ExternalLinkIcon />
					</Button>
				</div>
				<span
					className={styles.project}
					data-test={`west-editor:manifest-project-${index}`}
				>
					{projectName}
				</span>
			</div>
		</Card>
	);
}
