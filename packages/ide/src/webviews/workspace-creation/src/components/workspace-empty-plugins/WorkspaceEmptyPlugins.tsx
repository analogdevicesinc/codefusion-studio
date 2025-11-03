/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {ExternalLinkIcon, WarningIcon} from 'cfs-react-library';
import styles from './WorkspaceEmptyPlugins.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../common/contexts/LocaleContext';

type WorkspaceEmptyPluginsProps = Readonly<{
	selectedWorkspaceCreationPath: 'predefined' | 'manual';
	coreName?: string;
	socName?: string;
}>;

export default function WorkspaceEmptyPlugins({
	selectedWorkspaceCreationPath,
	coreName,
	socName
}: WorkspaceEmptyPluginsProps) {
	const l10n: TLocaleContext | undefined = useLocaleContext();

	return (
		<div className={styles.emptyMessageContainer}>
			<div className={styles.warningIcon}>
				<WarningIcon />
			</div>

			<div className={styles.emptyMessage}>
				{selectedWorkspaceCreationPath === 'predefined'
					? l10n?.['plugin-option']?.empty?.description
					: `There are no plugins installed that offer manual configuration for ${socName} ${coreName} core. You can install compatible plugins to enable manual configuration of a workspace.`}
			</div>
			<div className={styles.documentationLink}>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/package-manager/install-required/'>
					<div>{l10n?.['plugin-option']?.empty?.documentation}</div>
					<ExternalLinkIcon />
				</a>
			</div>
		</div>
	);
}
