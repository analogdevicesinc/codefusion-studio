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

import {useCallback, useEffect, useState} from 'react';
import {
	CheckBox,
	DropDown,
	IntegerField,
	TextField
} from 'cfs-react-library';
import type {
	Image,
	SlotSizeUnit
} from '../../../../../types/application-packages';
import {
	validateHeaderSize,
	validateSlotCapacity,
	validateSlotSize
} from '../../../../../utils/application-package-validation';
import {
	computeSlotSizeChange,
	computeSlotUnitChange,
	computeTotalCustomTlvSize
} from '../../../../../utils/mcuboot';
import {SLOT_SIZE_UNIT_OPTIONS} from '../../../constants';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../../common/contexts/LocaleContext';
import {ByteUnitMap} from '../../../../../types/memory';
import styles from '../../image-content/image-content.module.scss';

type ImageSizeProps = Readonly<{
	currentImage: Image;
	onUpdateImage: (updates: Partial<Omit<Image, 'id'>>) => void;
}>;

function ImageSize({currentImage, onUpdateImage}: ImageSizeProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.image;

	const [headerSizeError, setHeaderSizeError] = useState<
		string | undefined
	>();

	// Slot size stepper state
	const [slotSizeUnit, setSlotSizeUnit] = useState<SlotSizeUnit>(
		currentImage.slotSizeUnit ?? 'KB'
	);
	const [slotDisplaySize, setSlotDisplaySize] = useState(
		currentImage.slotSize / ByteUnitMap[slotSizeUnit]
	);
	const [slotSizeError, setSlotSizeError] = useState<
		string | undefined
	>();

	// Sync display values when currentImage changes externally

	useEffect(() => {
		const unit = currentImage.slotSizeUnit ?? 'KB';
		setSlotSizeUnit(unit);
		setSlotDisplaySize(currentImage.slotSize / ByteUnitMap[unit]);
	}, [currentImage.slotSize, currentImage.slotSizeUnit]);

	// Re-validate header when swapAlignment or slotSize changes
	useEffect(() => {
		const error = validateHeaderSize(
			currentImage.headerSize,
			currentImage.slotSize,
			currentImage.swapAlignment
		);
		setHeaderSizeError(error);
	}, [
		currentImage.headerSize,
		currentImage.slotSize,
		currentImage.swapAlignment
	]);

	// Re-validate slot capacity when relevant values change
	useEffect(() => {
		const totalTlvSize = computeTotalCustomTlvSize(
			currentImage.customTLVs ?? []
		);

		const capacityError = validateSlotCapacity(
			currentImage.slotSize,
			currentImage.headerSize,
			currentImage.binFileSize,
			totalTlvSize
		);

		const unitError = validateSlotSize(
			currentImage.slotSize / ByteUnitMap[slotSizeUnit],
			slotSizeUnit
		);

		setSlotSizeError(unitError ?? capacityError);
	}, [
		currentImage.slotSize,
		currentImage.headerSize,
		currentImage.binFileSize,
		currentImage.customTLVs,
		slotSizeUnit
	]);

	const handleHeaderSizeChange = useCallback(
		(headerSize: number) => {
			const error = validateHeaderSize(
				headerSize,
				currentImage.slotSize,
				currentImage.swapAlignment
			);
			setHeaderSizeError(error);
			onUpdateImage({headerSize});
		},
		[currentImage.slotSize, currentImage.swapAlignment, onUpdateImage]
	);

	const handleSlotSizeChange = useCallback(
		(displayValue: number) => {
			const {bytesValue} = computeSlotSizeChange(
				displayValue,
				slotSizeUnit
			);
			const unitError: string | undefined = validateSlotSize(
				displayValue,
				slotSizeUnit
			);
			const totalTlvSize = computeTotalCustomTlvSize(
				currentImage.customTLVs ?? []
			);
			const capacityError = validateSlotCapacity(
				bytesValue,
				currentImage.headerSize,
				currentImage.binFileSize,
				totalTlvSize
			);
			setSlotDisplaySize(displayValue);
			setSlotSizeError(unitError ?? capacityError);
			onUpdateImage({
				slotSize: bytesValue,
				slotSizeUnit
			});
		},
		[
			slotSizeUnit,
			currentImage.customTLVs,
			currentImage.headerSize,
			currentImage.binFileSize,
			onUpdateImage
		]
	);

	const handleSlotUnitChange = useCallback(
		(newUnit: SlotSizeUnit) => {
			const result = computeSlotUnitChange(
				slotDisplaySize,
				slotSizeUnit,
				newUnit
			);
			const unitError: string | undefined = validateSlotSize(
				result.newDisplayValue,
				result.newUnit
			);
			const totalTlvSize = computeTotalCustomTlvSize(
				currentImage.customTLVs ?? []
			);
			const capacityError = validateSlotCapacity(
				result.bytesValue,
				currentImage.headerSize,
				currentImage.binFileSize,
				totalTlvSize
			);

			setSlotSizeUnit(result.newUnit);
			setSlotDisplaySize(result.newDisplayValue);
			setSlotSizeError(unitError ?? capacityError);
			onUpdateImage({
				slotSize: result.bytesValue,
				slotSizeUnit: result.newUnit
			});
		},
		[
			slotDisplaySize,
			slotSizeUnit,
			currentImage.customTLVs,
			currentImage.headerSize,
			currentImage.binFileSize,
			onUpdateImage
		]
	);

	return (
		<>
			<div className={styles.formField}>
				<span className={styles.title}>{l10n?.fields?.slotSize}</span>
				<div className={styles.sizeFieldContainer}>
					<div className={styles.sizeStepper}>
						<IntegerField
							value={slotDisplaySize}
							step={1}
							min={0}
							allowNegative={false}
							error={slotSizeError}
							dataTest={`image:${currentImage.name}-slot-size`}
							onValueChange={handleSlotSizeChange}
						/>
					</div>
					<div className={styles.sizeDropdown}>
						<DropDown
							controlId='slotSizeUnit'
							dataTest={`image:${currentImage.name}-slot-size-unit`}
							currentControlValue={slotSizeUnit}
							options={SLOT_SIZE_UNIT_OPTIONS}
							onHandleDropdown={value => {
								handleSlotUnitChange(value as SlotSizeUnit);
							}}
						/>
					</div>
				</div>
			</div>

			<div className={styles.formField}>
				<span className={styles.title}>
					{l10n?.fields?.headerSize}
				</span>
				<div className={styles.sizeFieldContainer}>
					<div className={styles.sizeStepper}>
						<IntegerField
							value={currentImage.headerSize}
							step={1}
							min={32}
							max={4096}
							allowNegative={false}
							error={headerSizeError}
							dataTest={`image:${currentImage.name}-header-size`}
							onValueChange={handleHeaderSizeChange}
						/>
					</div>
					<div className={styles.sizeDropdown}>
						<TextField
							isDisabled
							dataTest={`image:${currentImage.name}-header-size-unit`}
							inputVal='bytes'
						/>
					</div>
				</div>
			</div>
			<div className={styles.checkboxField}>
				<CheckBox
					checked={currentImage.padHeader}
					dataTest='image-pad-header'
					onChange={() => {
						onUpdateImage({padHeader: !currentImage.padHeader});
					}}
				>
					{l10n?.fields?.padHeader}
				</CheckBox>
			</div>
		</>
	);
}

export default ImageSize;
