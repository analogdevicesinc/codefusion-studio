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

import {useEffect, useMemo} from 'react';
import styles from './install-progress.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import ActionBar from '../action-bar/ActionBar';
import {
	buildPackageReference,
	type InstallStatus
} from '../../state/slices/packages/packages.reducer';
import {
	useAlreadyInstalledRefs,
	useInstallStatus,
	useInstallTargets
} from '../../state/slices/packages/packages.selector';
import {installProgressShownNotification} from '@constants/messages/package-manager-messages';
import {useMessenger} from '@common/contexts/MessengerContext';

type InstallProgressPageProps = {
	/** Called when the user confirms the finished installation. */
	readonly onFinish: () => void;
};

type RowState =
	| 'installing'
	| 'installed'
	| 'already-installed'
	| 'failed';

/**
 * Resolves a single row's state from the status of the bulk install the rows
 * belong to. The install runs as one backend call, so every row shares its
 * outcome.
 */
function resolveRowState(
	overall: InstallStatus,
	alreadyInstalled: boolean
): RowState {
	// Takes precedence: the install had nothing to do for this package, which
	// the backend reports by omitting it from the install result entirely.
	if (alreadyInstalled) return 'already-installed';

	if (overall === 'done') return 'installed';
	if (overall === 'error') return 'failed';

	return 'installing';
}

/**
 * Installation progress page shown after the user accepts the package
 * licenses. The install is kicked off by the license page and this page simply
 * reflects its status from the store, to avoid react's strict mode
 */
export default function InstallProgressPage({
	onFinish
}: InstallProgressPageProps) {
	const l10n = useLocaleContext()?.installProgress;
	const actionBarL10n = useLocaleContext()?.actionBar;
	const status = useInstallStatus();
	const messenger = useMessenger();

	// The exact set the install was started with (selected packages + their
	// dependencies), recorded in the store when the install began.
	const packages = useInstallTargets();

	// Send notification to extension when this page mounts to show VS Code notification immediately
	useEffect(() => {
		if (messenger && packages.length > 0) {
			void messenger.sendNotification(
				installProgressShownNotification,
				{type: 'extension'},
				{packageCount: packages.length, packages}
			);
		}
	}, [messenger, packages]);

	// Packages this install left untouched because they were already installed
	// at the requested version; they are absent from the install result and must
	// not be read as failures.
	const alreadyInstalledRefs = useAlreadyInstalledRefs();
	const alreadyInstalled = useMemo(
		() => new Set(alreadyInstalledRefs),
		[alreadyInstalledRefs]
	);

	// The install runs as one bulk backend call; Finish unlocks only once it
	// reaches a terminal state.
	const isComplete = status === 'done' || status === 'error';

	const rowLabel = (rowState: RowState): string => {
		switch (rowState) {
			case 'installed':
				return l10n?.statusInstalled ?? 'OK';
			case 'already-installed':
				return l10n?.statusAlreadyInstalled ?? 'Already Installed';
			case 'failed':
				return l10n?.statusFailed ?? 'Failed';
			default:
				return l10n?.statusInProgress ?? 'In Progress';
		}
	};

	return (
		<div className={styles.outerFrame}>
			<div className={styles.main}>
				<div className={styles.container}>
					<div className={styles.header}>
						<span className={styles.title}>{l10n?.title}</span>
						<span className={styles.description}>
							{l10n?.subtitle}
						</span>
					</div>
					<div className={styles.installList}>
						{packages.map(pkg => {
							const reference = buildPackageReference(
								pkg.name,
								pkg.version
							);
							const rowState = resolveRowState(
								status,
								alreadyInstalled.has(reference)
							);
							const isError = rowState === 'failed';

							return (
								<div
									key={reference}
									data-test={`install-row-${pkg.name}`}
									className={styles.packageLine}
								>
									<span className={styles.state}>
										{l10n?.installingLabel}
									</span>
									<div className={styles.nameAndVersion}>
										<span className={styles.text}>{pkg.name}</span>
										<span className={styles.text}>
											v{pkg.version}
										</span>
									</div>
									<span
										className={styles.leader}
										aria-hidden='true'
									/>
									<span
										data-test={`install-status-${pkg.name}`}
										className={
											isError
												? `${styles.state} ${styles.stateError}`
												: styles.state
										}
									>
										{rowLabel(rowState)}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>
			<ActionBar
				dataTest='install-action-bar'
				primaryAction={{
					label: actionBarL10n?.finish ?? '',
					disabled: !isComplete,
					onClick: onFinish
				}}
			/>
		</div>
	);
}
