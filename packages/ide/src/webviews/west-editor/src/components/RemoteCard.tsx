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
	CopyIcon,
	LinkIcon,
	Tooltip,
	TruncatedText
} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './RemoteCard.module.scss';

type RemoteCardProps = Readonly<{
	/** Remote's identifier, as referenced by `projects[].remote`. */
	name: string;
	/** Base URL projects on this remote are resolved against (`url-base`). */
	url: string;
	/** Position in the manifest, used for the test hooks. */
	index: number;
	onCopyUrl: () => void;
}>;

/**
 * One remote in the manifest: its name and the URL projects are fetched from.
 *
 * Presentational - the clipboard write is the caller's, so the card itself has
 * no side effect to stub.
 */
export default function RemoteCard({
	name,
	url,
	index,
	onCopyUrl
}: RemoteCardProps) {
	const l10n = useLocaleContext();

	return (
		<Card
			disableHoverEffects
			testId={`west-editor:remote-card-${index}`}
		>
			<div className={styles.card}>
				<h3
					className={styles.name}
					data-test={`west-editor:remote-name-${index}`}
				>
					{name}
				</h3>
				<div className={styles.link}>
					<LinkIcon className={styles.icon} aria-hidden />
					<TruncatedText
						side='left'
						className={styles.url}
						title={url}
						dataTest={`west-editor:remote-url-${index}`}
					>
						{url}
					</TruncatedText>
					<Tooltip title={l10n?.remotes.copyUrl}>
						<Button
							appearance='icon'
							className={styles.copyButton}
							ariaLabel={l10n?.remotes.copyUrl}
							dataTest={`west-editor:remote-copy-${index}`}
							onClick={onCopyUrl}
						>
							<CopyIcon />
						</Button>
					</Tooltip>
				</div>
			</div>
		</Card>
	);
}
