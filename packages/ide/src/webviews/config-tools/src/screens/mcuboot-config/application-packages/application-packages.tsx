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

import {DropDown, TextField} from 'cfs-react-library';
import {useActiveApplicationPackage} from '../../../state/slices/application-packages/applicationPackages.selector';
import {updateApplicationPackage} from '../../../state/slices/application-packages/applicationPackages.reducer';
import {useAppDispatch} from '../../../state/store';
import styles from './application-packages.module.scss';
import {useCallback, useMemo, useRef} from 'react';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import AssignSignKey from './assign-sign-key/assign-sign-key';
import NewAppPackage from './new-application-package/new-app-package';
import {useAddImage} from '../../../hooks/use-application-package-actions';
import ImageCard from '../image-card/image-card';
import {
	getProjectInfoList,
	isPrimaryCore
} from '../../../utils/config';
import {
	validatePackageCoreId,
	validatePackageVersion,
	validateSecurityCounter
} from '../../../utils/application-package-validation';
import ApplicationPackageHeader from './application-package-header/application-package-header';
import {MAX_TEXT_ARGUMENTS_LENGTH} from '../constants';

type ApplicationPackagesProps = {
	readonly scrollContainerRef: React.RefObject<HTMLDivElement>;
};

function ApplicationPackages({
	scrollContainerRef
}: ApplicationPackagesProps) {
	const dispatch = useAppDispatch();
	const activePackage = useActiveApplicationPackage();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage;

	const coreIdError = useMemo(
		() =>
			activePackage
				? validatePackageCoreId(
						activePackage.coreId,
						l10n?.fields?.validation?.coreIdRequired as
							| string
							| undefined
					)
				: undefined,
		[activePackage, l10n?.fields?.validation?.coreIdRequired]
	);

	const securityCounterError = useMemo(
		() =>
			activePackage &&
			(activePackage.images?.length ?? 0) > 1 &&
			isPrimaryCore(activePackage.coreId)
				? validateSecurityCounter(activePackage.securityCounter)
				: undefined,
		[activePackage]
	);

	const versionError = useMemo(
		() =>
			activePackage &&
			(activePackage.images?.length ?? 0) > 1 &&
			isPrimaryCore(activePackage.coreId)
				? validatePackageVersion(activePackage.version)
				: undefined,
		[activePackage]
	);

	const coreOptions = useMemo(() => {
		const projectInfoList = getProjectInfoList() ?? [];

		return [
			{
				value: '',
				label: l10n?.fields?.placeholders?.core ?? 'Make a selection'
			},
			...projectInfoList.map(p => ({
				value: p.CoreId,
				label: p.Name
			}))
		];
	}, [l10n]);

	const newlyAddedIdRef = useRef<string | undefined>(undefined);
	const hasMultipleImages =
		(activePackage?.images?.length ?? 0) > 1 &&
		isPrimaryCore(activePackage?.coreId ?? '');
	const hasImages = Boolean(activePackage?.images?.length);

	const handleSignKeyChange = useCallback(
		(key: string | undefined) => {
			if (!activePackage) return;
			dispatch(
				updateApplicationPackage({
					id: activePackage.id,
					updates: {signKey: key}
				})
			);
		},
		[activePackage, dispatch]
	);

	const addImage = useAddImage();

	const handleAddImage = useCallback(() => {
		newlyAddedIdRef.current = addImage();
	}, [addImage]);

	const handleDeleteImage = useCallback(
		(imageId: string) => {
			if (!activePackage) return;

			const updatedImages = (activePackage.images ?? []).filter(
				img => img.id !== imageId
			);

			dispatch(
				updateApplicationPackage({
					id: activePackage.id,
					updates: {images: updatedImages}
				})
			);
		},
		[activePackage, dispatch]
	);

	return (
		<div
			className={styles.appPackageContainer}
			data-test='mcuboot-config:app-packages-summary'
		>
			<ApplicationPackageHeader
				scrollContainerRef={scrollContainerRef}
				onAddImage={handleAddImage}
			/>
			{activePackage && (
				<div className={styles.formField}>
					<span className={styles.fieldTitle}>
						{l10n?.fields?.core}
					</span>
					<DropDown
						controlId='packageCore'
						currentControlValue={activePackage.coreId}
						options={coreOptions}
						dataTest='package-core'
						error={coreIdError}
						onHandleDropdown={(value: string) => {
							dispatch(
								updateApplicationPackage({
									id: activePackage.id,
									updates: {coreId: value}
								})
							);
						}}
					/>
				</div>
			)}
			{activePackage && hasMultipleImages && (
				<div className={styles.formField}>
					<span className={styles.fieldTitle}>
						{l10n?.fields?.version ?? 'Version'}
					</span>
					<TextField
						inputVal={activePackage.version ?? ''}
						placeholder={
							l10n?.fields?.placeholders?.startTypingPlaceholder
						}
						maxLength={MAX_TEXT_ARGUMENTS_LENGTH}
						dataTest='package-version'
						error={versionError}
						onInputChange={value => {
							dispatch(
								updateApplicationPackage({
									id: activePackage.id,
									updates: {
										version: value || undefined
									}
								})
							);
						}}
					/>
				</div>
			)}
			{activePackage && hasMultipleImages && (
				<div className={styles.formField}>
					<div className={styles.fieldTitle}>
						{l10n?.fields?.securityCounter ?? 'Security Counter'}
						<span className={styles.optionalText}>
							{l10n?.fields?.optional ?? 'Optional'}
						</span>
					</div>
					<TextField
						inputVal={
							activePackage.securityCounter === undefined
								? ''
								: String(activePackage.securityCounter)
						}
						placeholder={l10n?.fields?.placeholders?.securityCounter}
						dataTest='package-security-counter'
						error={securityCounterError}
						onInputChange={value => {
							const sanitized: string = value.replace(/\D/g, '');
							dispatch(
								updateApplicationPackage({
									id: activePackage.id,
									updates: {
										securityCounter: sanitized
											? parseInt(sanitized, 10)
											: undefined
									}
								})
							);
						}}
					/>
				</div>
			)}
			<AssignSignKey
				variant='package'
				selectedKey={activePackage?.signKey}
				onKeyChange={handleSignKeyChange}
			/>
			{hasImages ? (
				activePackage?.images?.map(img => {
					const isNew = newlyAddedIdRef.current === img.id;

					if (isNew) {
						newlyAddedIdRef.current = undefined;
					}

					return (
						<ImageCard
							key={img.id}
							image={img}
							defaultOpen={isNew}
							onDelete={handleDeleteImage}
						/>
					);
				})
			) : (
				<NewAppPackage
					onAddImage={handleAddImage}
				/>
			)}
		</div>
	);
}

export default ApplicationPackages;
