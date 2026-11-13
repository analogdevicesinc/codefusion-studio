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
import type {ComponentType, SVGProps} from 'react';
import {ProgressRing} from 'cfs-react-library';
import type {WestProjectStatus} from '@west-editor/types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import ModifiedFilesIcon from './icons/ModifiedFilesIcon';
import UntrackedFilesIcon from './icons/UntrackedFilesIcon';
import styles from './StatusBadge.module.scss';

type Tone = 'success' | 'warning' | 'neutral';

/** A codicon name, or an icon component filled with `currentColor`. */
type Icon = string | ComponentType<SVGProps<SVGSVGElement>>;

/** Icon and tone per status. Not cloned reuses Different revision's until designed. */
const APPEARANCE: Record<
	WestProjectStatus,
	{icon: Icon; tone: Tone}
> = {
	'in-sync': {icon: 'pass', tone: 'success'},
	'different-revision': {icon: 'warning', tone: 'warning'},
	'not-cloned': {icon: 'warning', tone: 'warning'},
	'modified-files': {icon: ModifiedFilesIcon, tone: 'warning'},
	'untracked-files': {icon: UntrackedFilesIcon, tone: 'warning'},
	disabled: {icon: 'circle-slash', tone: 'neutral'}
};

/** A status's icon, colored by its tone. */
function StatusIcon({status}: Readonly<{status: WestProjectStatus}>) {
	const {icon: Icon, tone} = APPEARANCE[status];

	if (typeof Icon === 'string') {
		return (
			<span
				className={`codicon codicon-${Icon} ${styles[tone]}`}
				aria-hidden
			/>
		);
	}

	return <Icon className={styles[tone]} aria-hidden />;
}

/** A project's status, or `loading` while it is being read. */
export type BadgeStatus = WestProjectStatus | 'loading';

type StatusBadgeProps = Readonly<{
	status: BadgeStatus;
	dataTest?: string;
}>;

/** How a project on disk compares with the manifest, shown beside its name. */
export default function StatusBadge({
	status,
	dataTest
}: StatusBadgeProps) {
	const l10n = useLocaleContext();

	return (
		<span className={styles.badge} data-test={dataTest}>
			{status === 'loading' ? (
				<ProgressRing className={styles.spinner} aria-hidden />
			) : (
				<StatusIcon status={status} />
			)}
			{l10n?.projects.status[status]}
		</span>
	);
}
