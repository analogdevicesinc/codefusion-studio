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
/**
 * Represents an ELF file and provides methods to access its data.
 */
export class ElfFileData {
	private dataViewer: DataView;
	private littleEndian: boolean;

	/**
	 * Constructs a new instance of the ElfFileData class.
	 * @param fileBytes The byte array representing the ELF file.
	 */
	constructor(fileBytes: ArrayBuffer) {
		this.dataViewer = new DataView(fileBytes);
		this.littleEndian = false; // big-endian default
	}

	/**
	 * Sets the endianness of the ELF file.
	 * @param isLittleEndian A boolean value indicating whether the file is little-endian.
	 */
	public setLittleEndian(isLittleEndian: boolean) {
		this.littleEndian = isLittleEndian;
	}

	/**
	 * Checks if the ELF file is little-endian.
	 * @returns A boolean value indicating whether the file is little-endian.
	 */
	public isLittleEndian(): boolean {
		return this.littleEndian;
	}

	/**
	 * Gets the DataView object for the ELF file.
	 * @returns The DataView object.
	 */
	public getDataView(): DataView {
		return this.dataViewer;
	}

	/**
	 * Reads a null-terminated string from the ELF file.
	 * @param startOffset The starting offset of the string.
	 * @param maxLength The maximum length of the string.
	 * @returns The read string.
	 */
	public readNullTerminatedString(
		startOffset: number,
		maxLength: number,
	): string {
		let length: number = maxLength;
		for (let i = 0; i < maxLength; i++) {
			if (
				startOffset + i >= this.dataViewer.byteLength ||
				this.dataViewer.getUint8(startOffset + i) === 0
			) {
				length = i;
				break;
			}
		}

		const strBytes = new Uint8Array(
			this.dataViewer.buffer,
			startOffset,
			length,
		);
		const str = String.fromCharCode(...strBytes);

		return str;
	}
}
