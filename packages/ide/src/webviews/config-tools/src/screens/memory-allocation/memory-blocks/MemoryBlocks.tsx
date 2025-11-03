/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
	DropDown,
	Stepper,
	HexInputField,
	type DropDownOptions
} from 'cfs-react-library';
import styles from './MemoryBlocks.module.scss';
import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {type MemoryBlock} from '@common/types/soc';
import {
	convertMemoryBetweenUnits,
	getFirstAvailableAddressFromBlock,
	getAddressOffset,
	getBaseblockFromAddress,
	getCleanDivisibleSizeUnit,
	getCoreMemoryAliases,
	getCoreMemoryBlocks,
	getPartitionBlockNames,
	getSizeStepValue,
	isBlockDisabled,
	isBlockOccupied,
	offsetAddress
} from '../../../utils/memory';
import BlockItem from '../block/block-item';
import {type Partition} from '../../../state/slices/partitions/partitions.reducer';
import {
	type ByteUnit,
	ByteUnitMap,
	type PartitionFormErrors
} from '../../../types/memory';
import {validatePartitionForm} from '../../../utils/memory-validation';
import {
	usePartitions,
	useSidebarState
} from '../../../state/slices/partitions/partitions.selector';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {isCoreSecure} from '../../../utils/soc-cores';

type MemoryBlockProps = Readonly<{
	partition: Partition;
	errors?: PartitionFormErrors;
	isFormTouched: boolean;
	blocksForType: MemoryBlock[];
	onChange: (value: Partial<Partition>) => void;
}>;

const sizeOptions: DropDownOptions = [
	{value: 'KB', label: 'KB'},
	{value: 'MB', label: 'MB'},
	{value: 'bytes', label: 'bytes'}
];

export const MemoryBlocks = memo(function MemoryBlocks({
	blocksForType,
	errors,
	partition,
	isFormTouched,
	onChange
}: MemoryBlockProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory.blocks;
	const {
		size,
		projects: cores,
		startAddress: address,
		blockNames,
		baseBlock,
		type: memoryType
	} = partition;

	const partitions = usePartitions();
	const memoryBlocks: MemoryBlock[] = getCoreMemoryBlocks();
	const {sidebarPartition} = useSidebarState();
	const [localUnit, setLocalUnit] = useState<ByteUnit>('KB');
	const [displaySize, setDisplaySize] = useState(
		convertMemoryBetweenUnits(size, 'bytes', localUnit)
	);

	const blockOptions: DropDownOptions = [
		{label: 'Select value', value: ''},
		...memoryBlocks
			.filter(block => block.Type === memoryType)
			.map(block => ({
				label: block.Name,
				value: block.Name,
				dataTest: block.Name,
				disabled:
					isBlockOccupied(block, sidebarPartition, partitions) ||
					isBlockDisabled(block, cores, memoryType)
			}))
	];

	const memoryAliases = useMemo(() => {
		const coreIds = cores
			.filter(c => isCoreSecure(c))
			.map(c => c.coreId);

		return getCoreMemoryAliases(baseBlock.Name, coreIds) ?? [];
	}, [baseBlock.Name, cores]);

	const offsetMemoryAliases = useMemo(() => {
		const baseOffset = getAddressOffset(
			baseBlock.AddressStart,
			address
		);

		return memoryAliases.map(alias => ({
			...alias,
			OffsetAddress: offsetAddress(alias.AliasBaseAddress, baseOffset)
		}));
	}, [memoryAliases, address, baseBlock.AddressStart]);

	const displayMemoryBlocks = useMemo(() => {
		if (!address || !size) {
			return false;
		}

		if (isFormTouched) {
			return !errors?.startAddress && !errors?.size;
		}

		const formErrors = validatePartitionForm(
			partition,
			partitions.filter(
				partition =>
					parseInt(partition.startAddress, 16) !==
					parseInt(sidebarPartition.startAddress, 16)
			),
			blocksForType
		).errors;

		return !formErrors?.startAddress && !formErrors?.size;
	}, [
		address,
		blocksForType,
		errors?.size,
		errors?.startAddress,
		isFormTouched,
		partition,
		partitions,
		sidebarPartition.startAddress,
		size
	]);

	const handleSizeChange = (value: number) => {
		setDisplaySize(value);
		handleMemoryChange(value, localUnit);
	};

	const handleUnitChange = (newUnit: ByteUnit) => {
		handleMemoryChange(displaySize, newUnit);
		setLocalUnit(newUnit);
	};

	const handleMemoryChange = (dSize: number, unit: ByteUnit) => {
		const value = dSize * ByteUnitMap[unit];

		const blocksRangeItems = getPartitionBlockNames(
			memoryBlocks,
			parseInt(address, 16),
			value
		);
		onChange({
			size: value,
			displayUnit: unit,
			blockNames: blocksRangeItems
		});
	};

	const handleDropdown = (value: string): void => {
		const baseBlock = memoryBlocks.find(
			block => block.Name === value
		);

		const addressFromBlockSelected = baseBlock
			? getFirstAvailableAddressFromBlock(baseBlock, partitions)
			: undefined;

		if (addressFromBlockSelected !== undefined && baseBlock) {
			const blocksRangeItems = getPartitionBlockNames(
				memoryBlocks,
				addressFromBlockSelected,
				size
			);
			onChange({
				baseBlock,
				startAddress: addressFromBlockSelected.toString(16),
				blockNames: blocksRangeItems
			});
		}
	};

	const onAddressChange = useCallback(
		(value: string): void => {
			const address = parseInt(value, 16);

			const blockFromAddress = getBaseblockFromAddress(
				memoryBlocks,
				address
			);

			if (
				blockFromAddress &&
				!isBlockDisabled(blockFromAddress, cores, memoryType)
			) {
				const blocksRangeItems = getPartitionBlockNames(
					memoryBlocks,
					address,
					size
				);

				onChange({
					startAddress: value,
					baseBlock: blockFromAddress,
					blockNames: blocksRangeItems
				});
			} else {
				onChange({
					startAddress: value,
					baseBlock,
					blockNames: []
				});
			}
		},
		[baseBlock, cores, memoryBlocks, memoryType, onChange, size]
	);

	const onSoftwareAddressChange = useCallback(
		(aliasBase: string, newAliasAddress: string): void => {
			const aliasBaseDec = parseInt(aliasBase, 16);
			const newAliasDec = parseInt(newAliasAddress, 16);
			const baseBlockStart = parseInt(baseBlock.AddressStart, 16);
			const newPhysicalAddress =
				newAliasDec - aliasBaseDec + baseBlockStart;

			onAddressChange(newPhysicalAddress.toString(16));
		},
		[baseBlock.AddressStart, onAddressChange]
	);

	useEffect(() => {
		setDisplaySize(
			convertMemoryBetweenUnits(size, 'bytes', localUnit)
		);
	}, [localUnit, size]);

	// To reset the local unit in edit mode when user changes localunit without editing the partition
	useEffect(() => {
		// We use DisplayUnit if present
		if (sidebarPartition.displayUnit) {
			setLocalUnit(sidebarPartition.displayUnit);

			return;
		}

		// Fallback for when DisplayUnit isn't present
		if (sidebarPartition.size) {
			setLocalUnit(getCleanDivisibleSizeUnit(sidebarPartition.size));
		}
	}, [sidebarPartition]);

	return (
		<div className={styles.container}>
			<h3>{i10n?.['memory-blocks']}</h3>
			<div className={`${styles.section} ${styles.blockSection}`}>
				<span className={styles.label}>{i10n?.base}</span>
				<div className={styles.blockDropdownContainer}>
					<DropDown
						controlId='baseBlock'
						dataTest='base-block-dropdown'
						currentControlValue={baseBlock?.Name}
						options={blockOptions}
						error={errors?.blocks}
						onHandleDropdown={value => {
							handleDropdown(value);
						}}
					/>
				</div>
			</div>
			<div className={`${styles.section} ${styles.addressSection}`}>
				<div className={styles.startAddressheader}>
					<span className={styles.label}>
						{memoryAliases.length > 0
							? i10n?.['physical-starting-address']
							: i10n?.['starting-address']}
					</span>
				</div>
				<div className={styles.stepperGap}>
					<HexInputField
						dataTest='start-address'
						value={address}
						error={errors?.startAddress}
						onValueChange={onAddressChange}
					/>
				</div>
				{offsetMemoryAliases?.map(memoryAlias => (
					<div
						key={`${memoryAlias.CoreId}${memoryAlias.Name}${memoryAlias.AliasBaseAddress}`}
						className={styles.memoryAliasContainer}
					>
						<div className={styles.startAddressheader}>
							<span className={styles.label}>
								{`${memoryAlias.CoreId} ${memoryAlias.AliasType} ${i10n?.['starting-address']}`}
							</span>
						</div>
						<div className={styles.stepperGap}>
							<HexInputField
								dataTest={`software-start-address-${memoryAlias.CoreId}-${memoryAlias.Name}-${memoryAlias.AliasBaseAddress}`}
								value={memoryAlias.OffsetAddress}
								error={errors?.startAddress}
								onValueChange={value => {
									onSoftwareAddressChange(
										memoryAlias.AliasBaseAddress,
										value
									);
								}}
							/>
						</div>
					</div>
				))}
			</div>
			<div className={`${styles.section} ${styles.sizeSection}`}>
				<span className={styles.label}>{i10n?.size}</span>
				<div className={styles.sizeContainer}>
					<div className={styles.sizeStepper}>
						<Stepper
							dataTest='size-stepper'
							stepAmount={getSizeStepValue(
								baseBlock?.MinimumAlignment ?? 1,
								localUnit
							)}
							error={errors?.size}
							inputValue={displaySize}
							onValueChange={(value: number) => {
								handleSizeChange(value);
							}}
						/>
					</div>
					<div className={styles.sizeDropdown}>
						<DropDown
							controlId=''
							dataTest='size-dropdown'
							currentControlValue={localUnit}
							options={sizeOptions}
							onHandleDropdown={value => {
								handleUnitChange(value as ByteUnit);
							}}
						/>
					</div>
				</div>
			</div>
			<div>
				{displayMemoryBlocks &&
					memoryBlocks
						.filter(block =>
							blockNames.some(name => name === block.Name)
						)
						.map(block => (
							<div key={block.Name} className={styles.blockItem}>
								<BlockItem
									memoryBlock={block}
									size={size}
									newPartitionStartAddress={address}
								/>
							</div>
						))}
			</div>
		</div>
	);
});
