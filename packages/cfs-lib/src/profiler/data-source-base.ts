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

import { EventEmitter } from "node:events";
import type {
	IProfilerDataSource,
	ProfilerListeners
} from "./data-source.js";

/**
 * Maps each profiler data source event to its emitter argument tuple,
 * derived from the public listener signatures. Used to strongly type the
 * underlying {@link EventEmitter}.
 */
interface ProfilerDataSourceEventMap {
	data: Parameters<ProfilerListeners.OnData>;
	error: Parameters<ProfilerListeners.OnError>;
	disconnect: Parameters<ProfilerListeners.OnDisconnect>;
}

/**
 * Base class for profiler data sources.
 *
 * Implements the shared {@link EventEmitter} plumbing required by
 * {@link IProfilerDataSource} so that concrete implementations only need
 * to provide the transport-specific behaviour ({@link open}, {@link close},
 * {@link write} and {@link isOpen}).
 */
export abstract class ProfilerDataSourceBase implements IProfilerDataSource {
	private readonly emitter =
		new EventEmitter<ProfilerDataSourceEventMap>();

	abstract get isOpen(): boolean;

	abstract open(): Promise<void>;

	abstract close(): Promise<void>;

	abstract write(data: Buffer | string): Promise<number>;

	prime(): Promise<void> {
		return Promise.resolve();
	}

	onData(listener: (data: Buffer) => void): void {
		this.emitter.on("data", listener);
	}

	onError(listener: (error: Error) => void): void {
		this.emitter.on("error", listener);
	}

	onDisconnect(listener: () => void): void {
		this.emitter.on("disconnect", listener);
	}

	async dispose(): Promise<void> {
		try {
			await this.close();
		} catch (error) {
			console.debug(
				"Error while disposing profiler data source:",
				error
			);
		} finally {
			this.emitter.removeAllListeners();
		}
	}

	/**
	 * Emits a data event to registered listeners.
	 * @param data - The data received from the underlying source.
	 */
	protected emitData(data: Buffer): void {
		this.emitter.emit("data", data);
	}

	/**
	 * Emits an error event, guarding against Node's default behaviour of
	 * throwing when an `"error"` event has no listeners.
	 * @param error - The error to emit.
	 */
	protected emitError(error: Error): void {
		if (this.emitter.listenerCount("error") > 0) {
			this.emitter.emit("error", error);
		}
	}

	/**
	 * Emits a disconnect event to registered listeners.
	 */
	protected emitDisconnect(): void {
		this.emitter.emit("disconnect");
	}
}
