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
import {memo} from 'react';
import styles from '../../error.module.scss';
import {
	Card,
	CheckBox,
	DropDown,
	ProgressRing
} from 'cfs-react-library';

import {VSCodeLink} from '@vscode/webview-ui-toolkit/react';
import type {TLocaleContext} from '@common/types/l10n';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {UpdateResolutionStatusType} from '../missing-components/missing-components-error';
import ConflictIcon from '@common/icons/Conflict';
import CircledCheckmarkIcon from '@common/icons/CircledCheckmark';
import type {
	CfsMissingComponent,
	CfsUpdateResolutionType
} from 'cfs-types';

const docLink =
	'https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/package-manager/install-required/';

type UpdateResolutionCardProps = Readonly<{
	status?: UpdateResolutionStatusType;
	component: CfsMissingComponent;
	description: string;
	selected: CfsUpdateResolutionType;
	allowFutureCompatibleVersion: boolean;
	updateToVersion: string;
	resolutions: Array<{
		value: CfsUpdateResolutionType;
		label: string;
	}>;
	errorMessage?: string;
	onResolutionChange: (value: string) => void;
	onAllowFutureCompatibleVersion: () => void;
}>;

function UpdateResolutionCard({
	status = undefined,
	component,
	description,
	selected,
	allowFutureCompatibleVersion,
	updateToVersion,
	resolutions,
	errorMessage,
	onResolutionChange,
	onAllowFutureCompatibleVersion
}: UpdateResolutionCardProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.errors.missingComponents;

	const showResolution =
		(status === undefined ||
			status === 'UPDATE_FAILED' ||
			status === 'LOADING_RESOLUTIONS') &&
		(resolutions.length > 0 || status === 'LOADING_RESOLUTIONS');

	const showDescription =
		status !== 'UPDATE_COMPLETED' && status !== 'UPDATE_IN_PROGRESS';

	const showTitleWithNoStatus =
		status === undefined || status === 'LOADING_RESOLUTIONS';

	const showErrorMessage = status === 'UPDATE_FAILED' && errorMessage;

	const showDescriptionOrError = showDescription || showErrorMessage;

	const missingComponentTitle =
		component.type === 'plugin'
			? i10n?.errorItem.missingPluginTitle
			: i10n?.errorItem.missingDataModelTitle;

	const headerStatusFragment = {
		UPDATE_IN_PROGRESS: (
			<>
				<span data-test={`${component.id}:installing-state`}>
					Installing
				</span>
				<ProgressRing
					width='16'
					height='16'
					className={styles.headerStatusIcon}
				/>
			</>
		),
		UPDATE_FAILED: (
			<>
				<span data-test={`${component.id}:error-state`}>
					Installation Failed
				</span>
				<ConflictIcon className={styles.headerStatusIcon} />
			</>
		),
		UPDATE_COMPLETED: (
			<>
				<span data-test={`${component.id}:complete-state`}>
					Installed
				</span>
				<CircledCheckmarkIcon />
			</>
		)
	};

	return (
		<Card disableHoverEffects hasError={status === 'UPDATE_FAILED'}>
			<div className={styles.errorItemCard}>
				<div className={styles.errorSummary}>
					{showTitleWithNoStatus && (
						<div className={styles.missingComponentTitle}>
							{missingComponentTitle}
						</div>
					)}

					{!showTitleWithNoStatus && (
						<div className={styles.missingComponentTouchedHeader}>
							<span className={styles.missingComponentHeaderName}>
								{component.type === 'plugin'
									? component.id
									: `${component.soc}-${component.id}`}
							</span>
							<span className={styles.missingComponentHeaderVersion}>
								{updateToVersion}
							</span>
							<span className={styles.missingComponentHeaderStatus}>
								{headerStatusFragment[status]}
							</span>
						</div>
					)}

					{showDescriptionOrError && (
						<>
							{showErrorMessage && (
								<div
									className={styles.missingComponentDescriptionError}
								>
									{errorMessage}
								</div>
							)}

							{showDescription && (
								<div className={styles.missingComponentDescription}>
									{description}
								</div>
							)}

							<VSCodeLink className={styles.linkText} href={docLink}>
								{i10n?.linkText}
							</VSCodeLink>
						</>
					)}
				</div>

				{showResolution && (
					<div className={styles.resolutionContainer}>
						<div className={styles.resolutionLabel}>
							{i10n?.errorItem.resolutionOptionsLabel}
						</div>

						{status === 'LOADING_RESOLUTIONS' ? (
							<div className={styles.loadingResolution}>
								<ProgressRing
									width='16'
									height='16'
									position='start'
									className={styles.loadingResolutionStatus}
								/>
								<div>
									{i10n?.errorItem?.loadingResolutionsMessage ??
 										'This operation can take several minutes, please wait...'}
								</div>
							</div>
						) : (
							<>
								<DropDown
									controlId={`component-resolution-${String(component.id)}`}
									currentControlValue={selected}
									options={resolutions}
									onHandleDropdown={onResolutionChange}
								/>

								<CheckBox
									checked={allowFutureCompatibleVersion}
									onChange={onAllowFutureCompatibleVersion}
								>
									<span className={styles.futureVersionsLabel}>
										{i10n?.errorItem.allowFutureVersions}
									</span>
								</CheckBox>
							</>
						)}
					</div>
				)}
			</div>
		</Card>
	);
}

export default memo(UpdateResolutionCard);
