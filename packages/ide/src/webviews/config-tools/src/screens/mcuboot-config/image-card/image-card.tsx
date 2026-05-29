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

import {useCallback, useEffect, useRef, useState} from 'react';
import {
	Badge,
	Button,
	DeleteIcon,
	InlineEditField,
	Tooltip
} from 'cfs-react-library';
import EditIcon from '../../../../../common/icons/Edit';
import ConflictIcon from '../../../../../common/icons/Conflict';
import ApplicationPackageCard from '../application-package-card/application-package-card';
import {
	type CustomTLV,
	type Image
} from '../../../types/application-packages';
import {updateApplicationPackage} from '../../../state/slices/application-packages/applicationPackages.reducer';
import {useActiveApplicationPackage} from '../../../state/slices/application-packages/applicationPackages.selector';
import {useAppDispatch} from '../../../state/store';
import {useEditableField} from '../../../hooks/use-editable-field';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {getFileSize} from '../../../../../common/api';
import {useImageValidation} from './use-image-validation';
import {
	computeEndAddress,
	stripHexPrefix
} from '../../../utils/mcuboot';
import ImageContent from './image-content/image-content';
import styles from './image-card.module.scss';
import {MAX_NAME_LENGTH, sanitizeName} from '../constants';

type ImageCardProps = Readonly<{
	image: Image;
	onDelete: (id: string) => void;
	defaultOpen?: boolean;
}>;

function ImageCard({
	image,
	onDelete,
	defaultOpen = false
}: ImageCardProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const newlyAddedTlvIdRef = useRef<string | undefined>(undefined);
	const dispatch = useAppDispatch();
	const activePackage = useActiveApplicationPackage();
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.image;

	const currentImage =
		activePackage?.images?.find(img => img.id === image.id) ?? image;

	const {errors, hasError} = useImageValidation(currentImage);

	const endAddress = computeEndAddress(
		currentImage.locationAddress,
		currentImage.slotSize
	);

	const showAddressRange =
		Boolean(currentImage.locationAddress) && Boolean(endAddress);

	const updateImage = useCallback(
		(updates: Partial<Omit<Image, 'id'>>) => {
			if (!activePackage) return;

			const updatedImages = (activePackage.images ?? []).map(img =>
				img.id === image.id ? {...img, ...updates} : img
			);

			dispatch(
				updateApplicationPackage({
					id: activePackage.id,
					updates: {images: updatedImages}
				})
			);
		},
		[activePackage, image.id, dispatch]
	);

	// Re-fetch binFileSize on mount when the image has a path but the
	// size was not persisted (e.g. after reopening the .cfsconfig file).
	useEffect(() => {
		let cancelled = false;

		if (currentImage.path && currentImage.binFileSize === undefined) {
			void getFileSize(currentImage.path)
				.then(size => {
					if (!cancelled) {
						updateImage({binFileSize: size});
					}
				})
				.catch((err: Error) => {
					console.error(err);
				});
		}

		return () => {
			cancelled = true;
		};
	}, [currentImage.path, currentImage.binFileSize, updateImage]);

	const nameField = useEditableField({
		initialValue: image.name,
		maxLength: MAX_NAME_LENGTH,
		sanitize: sanitizeName,
		onConfirm(value: string) {
			updateImage({name: value});
		}
	});

	const descriptionField = useEditableField({
		initialValue: image.description ?? '',
		onConfirm(value: string) {
			updateImage({description: value});
		},
		allowEmpty: true
	});

	const handleAddCustomTLV = useCallback(() => {
		const existingTLVs = currentImage.customTLVs ?? [];
		const existingNames = new Set(existingTLVs.map(tlv => tlv.name));

		let counter = 1;

		while (existingNames.has(`Custom TLV ${String(counter)}`)) {
			counter++;
		}

		const newTLV: CustomTLV = {
			id: crypto.randomUUID(),
			name: `Custom TLV ${String(counter)}`,
			tag: 0,
			value: ''
		};

		newlyAddedTlvIdRef.current = newTLV.id;
		updateImage({customTLVs: [...existingTLVs, newTLV]});
	}, [currentImage.customTLVs, updateImage]);

	const handleDeleteImageCustomTLV = useCallback(
		(tlvId: string) => {
			const updatedTLVs = (currentImage.customTLVs ?? []).filter(
				tlv => tlv.id !== tlvId
			);

			updateImage({customTLVs: updatedTLVs});
		},
		[currentImage.customTLVs, updateImage]
	);

	const handleUpdateImageCustomTLV = useCallback(
		(tlvId: string, updates: Partial<Omit<CustomTLV, 'id'>>) => {
			const updatedTLVs = (currentImage.customTLVs ?? []).map(tlv =>
				tlv.id === tlvId ? {...tlv, ...updates} : tlv
			);

			updateImage({customTLVs: updatedTLVs});
		},
		[currentImage.customTLVs, updateImage]
	);

	const handleDelete = useCallback(() => {
		onDelete(image.id);
	}, [image.id, onDelete]);

	const newlyAddedTlvId = newlyAddedTlvIdRef.current;
	newlyAddedTlvIdRef.current = undefined;

	return (
		<ApplicationPackageCard
			dataTest={`image-card:${image.id}`}
			isOpen={isOpen}
			setOpen={setIsOpen}
		>
			<div slot='title' className={styles.titleSlot}>
				<div className={styles.nameRow}>
					{nameField.isEditing ? (
						<div
							className={styles.nameFieldContainer}
							onClick={e => {
								e.stopPropagation();
							}}
						>
							<InlineEditField
								ref={nameField.inputRef}
								inputVal={nameField.editValue}
								placeholder={l10n?.placeholders?.name}
								dataTest='edit-image-name'
								maxLength={nameField.maxLength}
								onInputChange={nameField.setEditValue}
								onConfirm={nameField.confirmEdit}
								onCancel={nameField.cancelEdit}
							/>
						</div>
					) : (
						<div className={styles.header}>
							<div
								className={styles.editableField}
								data-test={`image-card:${image.id}-name`}
								onClick={e => {
									e.stopPropagation();
									nameField.startEditing();
								}}
							>
								<span className={styles.name}>{image.name}</span>
								<Button
									appearance='icon'
									className={styles.editButton}
								>
									<EditIcon />
								</Button>
							</div>
							<div className={styles.badgeContainer}>
								<Badge appearance='secondary'>{l10n?.badge}</Badge>
								{currentImage.bootable ? (
									<Badge appearance='secondary'>
										{l10n?.bootable}
									</Badge>
								) : (
									<Badge appearance='secondary'>
										{l10n?.nonBootable}
									</Badge>
								)}
							</div>
						</div>
					)}
				</div>
				{showAddressRange && (
					<div
						className={styles.addressRow}
						data-test={`image-card:${image.id}-address-range`}
					>
						<span>
							{`0x${stripHexPrefix(currentImage.locationAddress).toUpperCase()} - 0x${endAddress!}`}
						</span>
					</div>
				)}
				<div className={styles.descriptionRow}>
					{descriptionField.isEditing ? (
						<div
							className={styles.descriptionFieldContainer}
							onClick={e => {
								e.stopPropagation();
							}}
						>
							<InlineEditField
								ref={descriptionField.inputRef}
								inputVal={descriptionField.editValue}
								placeholder={l10n?.placeholders?.description}
								dataTest='edit-image-description'
								onInputChange={descriptionField.setEditValue}
								onConfirm={descriptionField.confirmEdit}
								onCancel={descriptionField.cancelEdit}
							/>
						</div>
					) : (
						<div
							className={styles.editableField}
							data-test={`image-card:${image.id}-description`}
							onClick={e => {
								e.stopPropagation();
								descriptionField.startEditing();
							}}
						>
							<span className={styles.description}>
								{image.description?.trim()
									? image.description
									: l10n?.descriptionPlaceholder}
							</span>
							<Button appearance='icon' className={styles.editButton}>
								<EditIcon />
							</Button>
						</div>
					)}
				</div>
			</div>
			<div slot='end' className={styles.endSlot}>
				{hasError && <ConflictIcon />}
				<Tooltip
					title={l10n?.delete}
					position='bottom'
					type='long'
					width={75}
				>
					<Button
						appearance='icon'
						dataTest='delete-image'
						onClick={e => {
							e.stopPropagation();
							handleDelete();
						}}
					>
						<DeleteIcon />
					</Button>
				</Tooltip>
			</div>
			<div slot='content'>
				<ImageContent
					currentImage={currentImage}
					errors={errors}
					newlyAddedTlvId={newlyAddedTlvId}
					onUpdateImage={updateImage}
					onAddCustomTLV={handleAddCustomTLV}
					onDeleteCustomTLV={handleDeleteImageCustomTLV}
					onUpdateCustomTLV={handleUpdateImageCustomTLV}
				/>
			</div>
		</ApplicationPackageCard>
	);
}

export default ImageCard;
