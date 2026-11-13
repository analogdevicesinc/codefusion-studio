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
	DeleteIcon,
	Divider,
	LinkIcon,
	TextField,
	TruncatedText
} from 'cfs-react-library';
import type {WestProject} from '@west-editor/types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import HighlightedText from './HighlightedText';
import ProjectGroups from './ProjectGroups';
import StatusBadge, {type BadgeStatus} from './StatusBadge';
import styles from './ProjectCard.module.scss';

type ProjectCardProps = Readonly<{
	/** The manifest entry, for its identity and its raw values. */
	project: WestProject;
	/** Fetch URL west resolves for this project; the URL row is omitted without one. */
	resolvedUrl?: string;
	/** Checkout path west resolves for this project. */
	effectivePath: string;
	/** Revision inherited from `defaults`, shown as a placeholder only. */
	inheritedRevision?: string;
	/** Position in the manifest, used for the test hooks. */
	index: number;
	/** Active search text; every occurrence in the name is highlighted. */
	searchTerm?: string;
	/** Every group the manifest knows about, offered when adding one. */
	availableGroups: string[];
	/** How the project on disk compares with the manifest, or `loading`; no badge without one. */
	status?: BadgeStatus;
	onRevisionChange: (revision: string) => void;
	onGroupsChange: (groups: string[]) => void;
	onDelete: () => void;
}>;

/**
 * One project in the manifest: its name, the revision it tracks, and where
 * west puts it and fetches it from.
 *
 * Presentational - every derived value arrives as a prop, so the raw
 * `project.path` and `project.revision` are never the thing rendered.
 */
export default function ProjectCard({
	project,
	resolvedUrl,
	effectivePath,
	inheritedRevision,
	index,
	searchTerm = '',
	availableGroups,
	status,
	onRevisionChange,
	onGroupsChange,
	onDelete
}: ProjectCardProps) {
	const l10n = useLocaleContext();

	return (
		<Card
			disableHoverEffects
			testId={`west-editor:project-card-${index}`}
		>
			<div className={styles.card}>
				<div className={styles.header}>
					<div className={styles.title}>
						<h2
							className={styles.name}
							data-test={`west-editor:project-name-${index}`}
						>
							<HighlightedText
								text={project.name}
								match={searchTerm}
							/>
						</h2>
						{status && (
							<StatusBadge
								status={status}
								dataTest={`west-editor:project-status-${index}`}
							/>
						)}
					</div>
					<Button
						appearance='icon'
						ariaLabel={l10n?.projects.remove}
						dataTest={`west-editor:project-remove-${index}`}
						onClick={onDelete}
					>
						<DeleteIcon />
					</Button>
				</div>
				<Divider className={styles.divider} />
				<div className={styles.row}>
					<div className={styles.revision}>
						<TextField
							fullWidth
							size='small'
							label={
								<span className={styles.label}>
									{l10n?.projects.revision}
								</span>
							}
							placeholder={inheritedRevision}
							inputVal={project.revision ?? ''}
							dataTest={`west-editor:project-revision-${index}`}
							onInputChange={onRevisionChange}
						/>
					</div>
					<div className={styles.groups}>
						<span className={styles.label}>
							{l10n?.projects.groups}
						</span>
						<ProjectGroups
							groups={project.groups ?? []}
							availableGroups={availableGroups}
							index={index}
							onChange={onGroupsChange}
						/>
					</div>
				</div>
				<Divider className={styles.divider} />
				<div className={styles.row}>
					<div className={styles.links}>
						<div className={styles.link}>
							<span
								className={`codicon codicon-folder ${styles.icon}`}
								aria-hidden
							/>
							<TruncatedText
								side='left'
								className={styles.linkText}
								title={effectivePath}
								dataTest={`west-editor:project-path-${index}`}
							>
								{effectivePath}
							</TruncatedText>
						</div>
						{resolvedUrl && (
							<div className={styles.link}>
								<LinkIcon className={styles.icon} aria-hidden />
								<TruncatedText
									side='left'
									className={styles.linkText}
									title={resolvedUrl}
									dataTest={`west-editor:project-url-${index}`}
								>
									{resolvedUrl}
								</TruncatedText>
							</div>
						)}
					</div>
				</div>
			</div>
		</Card>
	);
}
