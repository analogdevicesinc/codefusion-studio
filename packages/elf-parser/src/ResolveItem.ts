/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import { ElfFileData } from "./ElfFileData.js";

/**
 * Loads the data element from ELF file.
 */
export class ResolveItem {
	/**
	 * Retrieves a 32-bit value from the specified offset in the ElfFileData.
	 * The size of the value to retrieve is determined by the sizeInBytes parameter.
	 *
	 * @param fd - The ElfFileData object to retrieve the value from.
	 * @param offset - The offset in bytes from where to retrieve the value.
	 * @param sizeInBytes - The size in bytes of the value to retrieve.
	 * @returns The retrieved 32-bit value.
	 */
	public static Get32BitValue(
		fd: ElfFileData,
		offset: number,
		sizeInBytes: number,
	): number {
		const INITIAL_VALUE = 0;
		let value = INITIAL_VALUE;

		const SIZE_8BIT = 1;
		const SIZE_16BIT = 2;
		const SIZE_32BIT = 4;

		if (sizeInBytes === SIZE_8BIT) {
			value = fd.getDataView().getUint8(offset);
		} else if (sizeInBytes === SIZE_16BIT) {
			value = fd.getDataView().getUint16(offset, fd.isLittleEndian());
		} else if (sizeInBytes === SIZE_32BIT) {
			value = fd.getDataView().getUint32(offset, fd.isLittleEndian());
		} else {
			// Handle unsupported sizeInBytes
			throw new Error(`Unsupported sizeInBytes: ${sizeInBytes}`);
		}
		return value;
	}

	/**
	 * Gets the 64-bit value from the ELF file data.
	 *
	 * @param fd The ELF file data.
	 * @param offset The offset in the file data.
	 * @param sizeInBytes The size of the value in bytes.
	 * @returns The 64-bit value as a bigint.
	 */
	public static Get64BitValue(
		fd: ElfFileData,
		offset: number,
		sizeInBytes: number,
	): bigint {
		const INITIAL_VALUE = BigInt(0);
		const SIZE_64BIT = 8;
		let value: bigint = INITIAL_VALUE;

		if (sizeInBytes == SIZE_64BIT) {
			let bigNumber = INITIAL_VALUE;

			// Extract the left and right parts of the 64-bit value
			const SIZE_32BIT = 4;
			const left = BigInt(
				fd.getDataView().getUint32(offset | 0, !!fd.isLittleEndian()) >>> 0, // offset | 0: Ensure that offset is treated as an integer
			);
			const right = BigInt(
				fd
					.getDataView()
					.getUint32(((offset | 0) + SIZE_32BIT) | 0, !!fd.isLittleEndian()) >>>
					0,
			);

			// Combine the left and right parts based on the endianness
			value = fd.isLittleEndian()
				? (right << bigNumber) | left
				: (left << bigNumber) | right;
		} else {
			// If the size is not 8 bytes, treat it as a 32-bit value
			value = BigInt(fd.getDataView().getUint32(offset, fd.isLittleEndian()));
		}

		return value;
	}
}
