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
	type DropDownOptions,
	InfoIcon
} from 'cfs-react-library';
import styles from './MemoryBlocks.module.scss';
import {useEffect, useMemo, useState} from 'react';
import {type MemoryBlock} from '@common/types/soc';
import {
	convertBytesToKbOrMb,
	convertMemoryBetweenUnits,
	getBaseblockFromAddress,
	getCoreMemoryBlocks,
	getPartitionBlockNames
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
import {getSocCoreList} from '../../../utils/soc-cores';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import CfsTooltip from '../../../../../common/components/cfs-tooltip/CfsTooltip';

type MemoryBlockProps = {
	readonly partition: Partition;
	readonly errors?: PartitionFormErrors;
	readonly isFormTouched: boolean;
	readonly blocksForType: MemoryBlock[];
	readonly onChange: (value: Partial<Partition>) => void;
};

export function MemoryBlocks({
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
	const [isHovered, setIsHovered] = useState<boolean>(false);

	useEffect(() => {
		setDisplaySize(
			convertMemoryBetweenUnits(size, 'bytes', localUnit)
		);
	}, [localUnit, size]);

	// To reset the local unit in edit mode when user changes localunit  without editing the partition
	useEffect(() => {
		if (sidebarPartition.size) {
			const units = convertBytesToKbOrMb(sidebarPartition.size);

			if (units.split(' ')[1] === 'B') {
				setLocalUnit('bytes');
			} else if (units.split(' ')[1] === 'KB') {
				setLocalUnit('KB');
			} else setLocalUnit('MB');
		}
	}, [sidebarPartition]);

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
			blockNames: blocksRangeItems
		});
	};

	const getAddressFromBlock = (block: MemoryBlock): number =>
		parseInt(block.AddressStart, 16);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const isBlockDisabled = (block: MemoryBlock): boolean =>
		// Check if each core has access to the block
		cores.reduce((acc, core) => {
			const socCore = getSocCoreList().find(
				c => c.Id === core.coreId
			);

			if (
				socCore?.Memory.find(
					memory =>
						memory.Type === memoryType && memory.Name === block.Name
				)
			) {
				return acc;
			}

			return true;
		}, false);

	const blockOptions: DropDownOptions = [
		{label: 'Select value', value: ''},
		...memoryBlocks
			.filter(block => block.Type === memoryType)
			.map(block => ({
				label: block.Name,
				value: block.Name,
				dataTest: block.Name,
				disabled: isBlockDisabled(block)
			}))
	];

	const sizeOptions: DropDownOptions = [
		{value: 'KB', label: 'KB'},
		{value: 'MB', label: 'MB'},
		{value: 'bytes', label: 'bytes'}
	];

	const handleDropdown = (value: string): void => {
		const baseBlock = memoryBlocks.find(
			block => block.Name === value
		);

		const addressFromBlockSelected = baseBlock
			? getAddressFromBlock(baseBlock)
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

	const isSecureBlock = useMemo(() => {
		const filteredBlocks = memoryBlocks?.filter(
			block => block.Type === memoryType && !isBlockDisabled(block)
		);

		return Boolean(filteredBlocks?.[0]?.TrustZone);
	}, [isBlockDisabled, memoryBlocks, memoryType]);

	const getSizeStepValue = (
		minAlignment: number | undefined,
		unit: ByteUnit
	): number => {
		if (minAlignment && minAlignment > ByteUnitMap[unit]) {
			return minAlignment / ByteUnitMap[unit];
		}

		return 1;
	};

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

	const onAddressChange = (value: string): void => {
		const address = parseInt(value, 16);

		const blockFromAddress = getBaseblockFromAddress(
			memoryBlocks,
			address
		);

		if (blockFromAddress && !isBlockDisabled(blockFromAddress)) {
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
	};

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
						{i10n?.['starting-address']}
					</span>
					{isSecureBlock && (
						<div>
							<div
								onMouseEnter={() => {
									setIsHovered(true);
								}}
								onMouseLeave={() => {
									setIsHovered(false);
								}}
							>
								<InfoIcon />
							</div>
							{isHovered && (
								<CfsTooltip
									id='start-address'
									left={10}
									isShowingNotch={false}
								>
									<div>
										Please specify the address using the non-secure
										alias.
									</div>
								</CfsTooltip>
							)}
						</div>
					)}
				</div>
				<div className={styles.stepperGap}>
					<HexInputField
						dataTest='start-address'
						value={address}
						error={errors?.startAddress}
						onValueChange={onAddressChange}
					/>
				</div>
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
}
