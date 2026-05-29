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

import {useCallback} from 'react';
import {
	Button,
	CheckBox,
	DropDown,
	PlusIcon,
	TextField,
	Tooltip
} from 'cfs-react-library';
import {
	type ImageFormProps,
	type PublicKeyFormat
} from '../../../../types/application-packages';
import {
	DEFAULT_SWAP_ALIGNMENT,
	MAX_TEXT_ARGUMENTS_LENGTH,
	PUBLIC_KEY_FORMAT_OPTIONS,
	SWAP_ALIGNMENT_OPTIONS
} from '../../constants';
import CustomTLVCard from '../../custom-tlv/custom-tlv-card';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import ImageLocation from './image-location/image-location';
import ImageSize from './image-size/image-size';
import AssignSignKey from '../../application-packages/assign-sign-key/assign-sign-key';
import {selectFile} from '../../../../../../common/api';
import styles from '../image-content/image-content.module.scss';

function ImageForms({
	currentImage,
	errors,
	onUpdateImage,
	onAddCustomTLV,
	onDeleteCustomTLV,
	onUpdateCustomTLV,
	newlyAddedTlvId
}: ImageFormProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.image;

	const handleBrowseAesKwKey = useCallback(async () => {
		const rawPath = await selectFile({
			filters: {'Bin Files': ['bin']}
		});

		if (!rawPath) {
			return;
		}

		const path = rawPath.replace(/\\/g, '/');

		onUpdateImage({aesKwKeyPath: path});
	}, [onUpdateImage]);

	const handleAesKwKeyChange = useCallback(
		(value: string) => {
			const normalizedPath = value.replace(/\\/g, '/') || undefined;
			onUpdateImage({aesKwKeyPath: normalizedPath});
		},
		[onUpdateImage]
	);

	const handleBrowseAesGcmKey = useCallback(async () => {
		const rawPath = await selectFile({
			filters: {'Bin Files': ['bin']}
		});

		if (!rawPath) {
			return;
		}

		const path = rawPath.replace(/\\/g, '/');

		onUpdateImage({aesGcmKeyPath: path});
	}, [onUpdateImage]);

	const handleAesGcmKeyChange = useCallback(
		(value: string) => {
			const normalizedPath = value.replace(/\\/g, '/') || undefined;
			onUpdateImage({aesGcmKeyPath: normalizedPath});
		},
		[onUpdateImage]
	);

	return (
		<div className={styles.formContainer}>
			<ImageLocation
				currentImage={currentImage}
				errors={errors}
				onUpdateImage={onUpdateImage}
			/>

			<div className={styles.formField}>
				<span className={styles.title}>
					{l10n?.fields?.imageVersion}
				</span>
				<TextField
					inputVal={currentImage.imageVersion ?? ''}
					placeholder={l10n?.placeholders?.startTypingPlaceholder}
					maxLength={MAX_TEXT_ARGUMENTS_LENGTH}
					dataTest={`image:${currentImage.name}-image-version`}
					error={errors.imageVersion}
					onInputChange={value => {
						onUpdateImage({imageVersion: value || undefined});
					}}
				/>
			</div>

			<ImageSize
				currentImage={currentImage}
				onUpdateImage={onUpdateImage}
			/>

			<div className={styles.formField}>
				<span className={styles.title}>
					{l10n?.fields?.swapAlignment}
				</span>
				<DropDown
					controlId='swapAlignment'
					currentControlValue={
						currentImage.swapAlignment ?? DEFAULT_SWAP_ALIGNMENT
					}
					options={SWAP_ALIGNMENT_OPTIONS}
					dataTest='image-swap-alignment'
					onHandleDropdown={(value: string) => {
						onUpdateImage({
							swapAlignment: value
						});
					}}
				/>
			</div>

			<div className={styles.checkboxField}>
				<CheckBox
					checked={currentImage.bootable}
					dataTest='image-bootable'
					onChange={() => {
						onUpdateImage({bootable: !currentImage.bootable});
					}}
				>
					{l10n?.fields?.bootable}
				</CheckBox>
			</div>

			<AssignSignKey
				variant='image'
				selectedKey={currentImage.signKey}
				onKeyChange={(key: string | undefined) => {
					onUpdateImage({signKey: key});
				}}
			/>

			<div className={styles.checkboxField}>
				<CheckBox
					checked={currentImage.publicKeyFormatEnabled ?? false}
					dataTest='image-key-format-enabled'
					onChange={() => {
						onUpdateImage({
							publicKeyFormatEnabled:
								!currentImage.publicKeyFormatEnabled,
							...(currentImage.publicKeyFormatEnabled
								? {publicKeyFormat: undefined}
								: {publicKeyFormat: 'hash'})
						});
					}}
				>
					{l10n?.fields?.publicKeyFormat}
				</CheckBox>
			</div>
			{currentImage.publicKeyFormatEnabled && (
				<div className={styles.formField}>
					<DropDown
						controlId='publicKeyFormat'
						currentControlValue={currentImage.publicKeyFormat ?? ''}
						options={PUBLIC_KEY_FORMAT_OPTIONS}
						dataTest='image-public-key-format'
						error={errors.publicKeyFormat}
						onHandleDropdown={(value: string) => {
							onUpdateImage({
								publicKeyFormat:
									(value as PublicKeyFormat) || undefined
							});
						}}
					/>
				</div>
			)}

			<div className={styles.formField}>
				<div className={styles.header}>
					<span className={styles.title}>
						{l10n?.fields?.securityCounter}
					</span>
					<span className={styles.optionalText}>
						{l10n?.fields?.optional}
					</span>
				</div>
				<TextField
					inputVal={
						currentImage.securityCounter === undefined
							? ''
							: String(currentImage.securityCounter)
					}
					placeholder={l10n?.placeholders?.securityCounter}
					dataTest='image-security-counter'
					error={errors.securityCounter}
					onInputChange={value => {
						const sanitized: string = value.replace(/\D/g, '');
						onUpdateImage({
							securityCounter: sanitized
								? parseInt(sanitized, 10)
								: undefined
						});
					}}
				/>
			</div>

			<div className={styles.formField}>
				<div className={styles.header}>
					<span className={styles.title}>
						{l10n?.fields?.aesKwKey}
					</span>
					<span className={styles.optionalText}>
						{l10n?.fields?.optional}
					</span>
				</div>

				<TextField
					inputVal={currentImage.aesKwKeyPath ?? ''}
					placeholder={l10n?.placeholders?.aesKwKeyPath}
					dataTest='image-aes-kw-key-path'
					error={errors.aesKwKeyPath}
					startSlot={
						<Button appearance='icon' onClick={handleBrowseAesKwKey}>
							Browse
						</Button>
					}
					onInputChange={handleAesKwKeyChange}
				/>
			</div>

			<div className={styles.formField}>
				<div className={styles.header}>
					<span className={styles.title}>
						{l10n?.fields?.aesGcmKey}
					</span>
					<span className={styles.optionalText}>
						{l10n?.fields?.optional}
					</span>
				</div>
				<TextField
					inputVal={currentImage.aesGcmKeyPath ?? ''}
					placeholder={l10n?.placeholders?.aesGcmKeyPath}
					dataTest='image-aes-gcm-key-path'
					error={errors.aesGcmKeyPath}
					startSlot={
						<Button appearance='icon' onClick={handleBrowseAesGcmKey}>
							Browse
						</Button>
					}
					onInputChange={handleAesGcmKeyChange}
				/>
			</div>

			<div className={styles.customTlvSection}>
				<div className={styles.customTlvHeader}>
					<span className={styles.customTlvTitle}>
						{l10n?.fields?.customTlvs}
					</span>
					<Tooltip
						title={l10n?.tooltips?.addCustomTlv}
						position='bottom'
						type='long'
						width={100}
					>
						<Button
							appearance='icon'
							dataTest='image-add-custom-tlv'
							onClick={e => {
								e.stopPropagation();
								onAddCustomTLV();
							}}
						>
							<PlusIcon />
						</Button>
					</Tooltip>
				</div>
				{currentImage.customTLVs?.map(tlv => (
					<CustomTLVCard
						key={tlv.id}
						customTLV={tlv}
						siblingTlvs={currentImage.customTLVs ?? []}
						defaultOpen={tlv.id === newlyAddedTlvId}
						labelSize='small'
						onDelete={onDeleteCustomTLV}
						onUpdate={onUpdateCustomTLV}
					/>
				))}
			</div>

			<div className={styles.formField}>
				<span className={styles.title}>
					{l10n?.fields?.customArguments}
				</span>
				<TextField
					inputVal={currentImage.customArguments ?? ''}
					placeholder={l10n?.placeholders?.startTypingPlaceholder}
					dataTest='image-custom-arguments'
					maxLength={MAX_TEXT_ARGUMENTS_LENGTH}
					onInputChange={value => {
						onUpdateImage({
							customArguments: value || undefined
						});
					}}
				/>
			</div>
		</div>
	);
}

export default ImageForms;
