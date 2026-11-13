/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import { ElfSectionHeader } from "./ElfSectionHeader.js";

export class ElfCommentParser {
	private elfFileData: ElfFileData;
	private detectedCompiler = "Unknown";
	private comments: string[] = [];

	constructor(
		elfFileData: ElfFileData,
		commentSection: ElfSectionHeader
	) {
		this.elfFileData = elfFileData;
		this.parseCommentSection(commentSection);
	}

	public getDetectedCompiler() {
		return this.detectedCompiler;
	}

	public getComments(): string[] {
		return this.comments;
	}

	public parseCommentSection(commentSection: ElfSectionHeader) {
		const startOffset = Number(commentSection.offset);
		const length = Number(commentSection.size);

		const commentBytes = new Uint8Array(
			this.elfFileData.getDataView().buffer,
			startOffset,
			length
		);
		const commentString = String.fromCharCode(...commentBytes);

		this.comments = commentString.split("\0");
		let compilerFound = false;
		for (const comment of this.comments) {
			if (comment.length > 0 && comment[0] !== "$") {
				this.detectedCompiler = comment;
				compilerFound = true;
			}
		}
		// If not found, just use the first line
		if (!compilerFound && this.comments.length > 0) {
			this.detectedCompiler = this.comments[0];
		}
	}
}
