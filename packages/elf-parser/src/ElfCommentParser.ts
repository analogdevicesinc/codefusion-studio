import { ElfFileData } from "./ElfFileData.js";
import { ElfSectionHeader } from "./ElfSectionHeader.js";

interface SectionHeader {
	name: string;
	offset: number;
	size: number;
}

export class ElfCommentParser {
	private elfFileData: ElfFileData;
	private detectedCompiler = "Unknown";
	private comments: string[] = [];

	constructor(elfFileData: ElfFileData, commentSection: ElfSectionHeader) {
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
			length,
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
