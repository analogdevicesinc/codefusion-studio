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

import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import { EventEmitter } from "node:events";
import type { IProfilerDataSource } from "./data-source.js";
import {
	createDataSource,
	DataSourceConfig
} from "./data-source-factory.js";

/**
 * Default start tag that marks the beginning of a CTF trace.
 */
export const CTF_TRACE_START_TAG = Buffer.from("_zpl_ctf_start__");

/**
 * Command written to the data source to trigger the start of profiling
 * when the device is configured with TRACING_HANDLE_HOST_CMD.
 */
export const ENABLE_COMMAND = "enable";

/**
 * Configuration options for a recording session.
 */
export interface RecordingOptions {
	/** Data source configuration (serial or USB) */
	source: DataSourceConfig;
	/** Path to the output folder where data files will be saved */
	outputFolder: string;
	/**
	 * When `true`, the {@link ENABLE_COMMAND} is written to the data source to
	 * trigger the start of the profiling. This is required when the device is
	 * configured with TRACING_HANDLE_HOST_CMD. That option is always selected
	 * when USB is used as the tracing backend. In this scenario, no
	 * {@link CTF_TRACE_START_TAG} is transmitted, and the recording captures
	 * valid traces from the first byte.
	 */
	sendEnableCommand?: boolean;
}

/**
 * Represents an in-progress recording session.
 *
 * Use the static `start` method to begin a recording. Call `stop` on the
 * returned instance when the recording should end.
 */
export class Recording {
	private _bytesRecorded = 0;
	private readonly _capturedFiles: string[] = [];
	private readonly _options: RecordingOptions;

	private dataSource: IProfilerDataSource;

	private buffer = Buffer.alloc(0);
	private currentFile: fsPromises.FileHandle | undefined;

	/**
	 * Tracks the currently executing handleData operation to prevent concurrent
	 * access and allow stop() to wait for completion.
	 */
	private processingPromise: Promise<void> = Promise.resolve();

	private readonly errorEmitter = new EventEmitter();

	private constructor(options: RecordingOptions) {
		this._options = options;

		// Create data source
		this.dataSource = createDataSource(this._options.source);

		// Set up event handlers
		this.dataSource.onData((data: Buffer) => {
			// Chain data handling through processingPromise to serialize execution
			// and allow stop() to wait for completion
			this.processingPromise = this.processingPromise.then(() =>
				this.handleData(data)
			);
		});
		this.dataSource.onError((error: Error) => {
			this.emitError(error);
		});
	}

	/**
	 * Registers a listener invoked when an error occurs.
	 * @param listener - Callback receiving the error.
	 */
	onError(listener: (error: Error) => void): void {
		this.errorEmitter.on("error", listener);
	}

	/**
	 * Starts a new recording session.
	 * @param options - Configuration for the recording session
	 * @returns A Recording instance representing the in-progress recording
	 */
	static async start(options: RecordingOptions): Promise<Recording> {
		const recording = new Recording(options);
		try {
			// Ensure parent directory exists
			await fsPromises.mkdir(recording._options.outputFolder, {
				recursive: true
			});

			// Open the data source connection
			await recording.dataSource.open();

			// Signal the device to start streaming traces.
			if (options.sendEnableCommand) {
				// There are no start tags in this mode, so the file has to be
				// opened here.
				recording.currentFile = await recording.openTraceFile();
				await recording.dataSource.write(ENABLE_COMMAND);
			}
		} catch (error) {
			// Since we will not return the instance,
			// we need to clean up any resources we created
			await recording.dispose();
			throw error;
		}

		return recording;
	}

	/**
	 * Creates a filesystem-safe timestamp for trace file names.
	 */
	private createTimestampedTracefileName(): string {
		const now = new Date();
		const year = String(now.getFullYear());
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");

		return `tracefile_${year}${month}${day}_${hours}${minutes}${seconds}`;
	}

	/**
	 * Returns whether this recording has been stopped.
	 */
	get isStopped(): boolean {
		return !this.dataSource.isOpen;
	}

	/**
	 * Returns the total number of bytes recorded.
	 */
	get bytesRecorded(): number {
		return this._bytesRecorded;
	}

	/**
	 * Returns the trace files created during this recording.
	 */
	get capturedFiles(): string[] {
		return [...this._capturedFiles];
	}

	/**
	 * Stops the recording session.
	 *
	 * This is a no-op if the recording has already been stopped.
	 */
	async stop(): Promise<void> {
		if (!this.dataSource.isOpen) {
			return;
		}

		// Close data source first to prevent new data from arriving
		await this.dataSource.close();

		// Wait for any in-progress data processing to complete before closing files
		await this.processingPromise;

		if (this.currentFile) {
			await this.writeData(this.buffer);
			await this.currentFile.close().catch((error: unknown) => {
				// Log the error but don't rethrow, since the recording is effectively stopped at this point
				console.error("Error closing trace file:", error);
			});
			this.buffer = Buffer.alloc(0);
			this.currentFile = undefined;
		}
	}

	private async writeData(data: Buffer): Promise<void> {
		if (this.currentFile) {
			await this.currentFile.write(data);
			this._bytesRecorded += data.length;
		}
	}

	/**
	 * Handles incoming data from the data source.
	 */
	private async handleData(data: Buffer): Promise<void> {
		// First concatenate the new data to the existing buffer
		this.buffer = Buffer.concat([this.buffer, data]);

		// The tail of the buffer may contain a partial start tag,
		// so we need to leave that part unprocessed until we get more data.
		// If no more data is received, the last piece of data will be written
		// to the file when the recording is stopped.
		while (this.buffer.length >= CTF_TRACE_START_TAG.length) {
			const startTagIndex = this.buffer.indexOf(CTF_TRACE_START_TAG);
			if (startTagIndex !== -1) {
				// 1. Close open file (if exists) and discard data up to the start tag
				if (this.currentFile) {
					await this.writeData(
						this.buffer.subarray(0, startTagIndex)
					);
					await this.currentFile.close();
				}

				// Exclude the processed data and the CTF_TRACE_START_TAG from the buffer
				this.buffer = this.buffer.subarray(
					startTagIndex + CTF_TRACE_START_TAG.length
				);

				// 2. Open a new file for the new trace
				this.currentFile = await this.openTraceFile();

				// New file data will be written on the next loop iteration
				// (or when the recording is stopped).
				// In this way we don't need to handle potential new start tags on this iteration
				// Adding a continue here to make it explicit
				continue;
			} else if (this.currentFile) {
				// Calculate the tail begin index, where a partial start tag may be.
				// If it is an actual start tag, it will be processed on a following loop.
				const tailBegin =
					this.buffer.length - (CTF_TRACE_START_TAG.length - 1);

				// Write all data up to the tail.
				await this.writeData(this.buffer.subarray(0, tailBegin));
				this.buffer = this.buffer.subarray(tailBegin);
			} else {
				// No start tag found and no file open yet.
				// Wait for more data that might contain a start tag.
				break;
			}
		}
	}

	/**
	 * Creates the file path for a trace.
	 * This method ensures that we don't overwrite existing files by appending a counter to the file name if needed.
	 */
	private async openTraceFile(): Promise<fsPromises.FileHandle> {
		const originalFileName = this.createTimestampedTracefileName();
		let attempt = 0;

		// Give an upper limit in case things go really wrong
		while (attempt < 1000) {
			try {
				const fileName =
					attempt === 0
						? originalFileName
						: `${originalFileName}_${String(attempt)}`;
				const filePath = path.join(
					this._options.outputFolder,
					`${fileName}.ctf`
				);
				const fileHandle = await fsPromises.open(filePath, "wx");
				this._capturedFiles.push(filePath);
				return fileHandle;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "EEXIST") {
					attempt++;
				} else {
					throw error;
				}
			}
		}
		throw new Error(
			"Failed to create a unique trace file after 1000 attempts."
		);
	}

	/**
	 * Disposes of all resources held by the recording.
	 */
	async dispose(): Promise<void> {
		try {
			await this.stop();
		} catch {
			console.debug("Error stopping recording during dispose.");
		} finally {
			await this.dataSource.dispose();
			this.errorEmitter.removeAllListeners();
		}
	}

	/**
	 * Emits an error event, guarding against Node's default behaviour of
	 * throwing when an `"error"` event has no listeners.
	 * @param error - The error to emit.
	 */
	private emitError(error: Error): void {
		if (this.errorEmitter.listenerCount("error") > 0) {
			this.errorEmitter.emit("error", error);
		}
	}
}
