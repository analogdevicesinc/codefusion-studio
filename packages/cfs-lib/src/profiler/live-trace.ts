/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
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

import * as net from "node:net";
import { EventEmitter } from "node:events";
import type { IProfilerDataSource } from "./data-source.js";
import {
	createDataSource,
	DataSourceConfig
} from "./data-source-factory.js";

/** Default host of the TCP server that receives the forwarded CTF stream. */
const DEFAULT_LIVE_TRACE_TCP_HOST = "127.0.0.1";
/** Default port of the TCP server that receives the forwarded CTF stream. */
const DEFAULT_LIVE_TRACE_TCP_PORT = 5000;
/** Default delay between connection attempts, in milliseconds. */
const DEFAULT_LIVE_TRACE_CONNECT_RETRY_DELAY_MS = 250;
/**
 * Default number of attempts to connect to the TCP server.
 */
const DEFAULT_LIVE_TRACE_MAX_CONNECT_RETRIES =
	20_000 / DEFAULT_LIVE_TRACE_CONNECT_RETRY_DELAY_MS;

/**
 * Configuration options for a live trace session.
 */
export interface LiveTraceOptions {
	/** Data source configuration */
	source: DataSourceConfig;
	/** Host of the TCP server that receives the forwarded CTF stream */
	tcpHost?: string;
	/** Port of the TCP server that receives the forwarded CTF stream */
	tcpPort?: number;
	/** Maximum number of attempts to connect to the TCP server */
	maxConnectRetries?: number;
	/** Delay between connection attempts, in milliseconds */
	connectRetryDelayMs?: number;
}

/**
 * Forwards a CTF data stream from a profiler data source to a TCP server.
 */
export class LiveTrace {
	private readonly _options: LiveTraceOptions;
	private _isActive = false;

	private dataSource: IProfilerDataSource;
	private tcpClient?: net.Socket;

	private readonly errorEmitter = new EventEmitter();

	private constructor(options: LiveTraceOptions) {
		this._options = options;
		this.dataSource = createDataSource(this._options.source);

		this.dataSource.onData((data: Buffer) => {
			this.handleData(data);
		});
		this.dataSource.onError((error: Error) => {
			if (this._isActive) {
				this.emitError(error);
			}
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
	 * Returns whether the live trace session is currently active.
	 */
	get isActive(): boolean {
		return this._isActive;
	}

	/**
	 * Starts a live trace session.
	 *
	 * Connects to the TCP server, then opens the data source
	 * and begins forwarding.
	 * @param options - Live trace configuration
	 * @returns A LiveTrace instance representing the in-progress session
	 */
	static async start(options: LiveTraceOptions): Promise<LiveTrace> {
		const liveTrace = new LiveTrace(options);
		try {
			liveTrace._isActive = true;

			// Connect to the TCP server before opening the source so no data is dropped.
			await liveTrace.connect();

			// Start forwarding the CTF data stream.
			await liveTrace.dataSource.open();

			// Let the source make its stream decodable from the first byte.
			await liveTrace.dataSource.prime();
		} catch (error) {
			liveTrace.dispose();
			throw error;
		}

		return liveTrace;
	}

	/**
	 * Connects to the TCP server.
	 */
	private async connect(): Promise<void> {
		const targetHost =
			this._options.tcpHost ?? DEFAULT_LIVE_TRACE_TCP_HOST;
		const targetPort =
			this._options.tcpPort ?? DEFAULT_LIVE_TRACE_TCP_PORT;
		const maxRetries =
			this._options.maxConnectRetries ??
			DEFAULT_LIVE_TRACE_MAX_CONNECT_RETRIES;
		const delayMs =
			this._options.connectRetryDelayMs ??
			DEFAULT_LIVE_TRACE_CONNECT_RETRY_DELAY_MS;

		if (maxRetries < 1) {
			throw new Error(
				`maxConnectRetries must be at least 1, got ${String(
					maxRetries
				)}.`
			);
		}

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const socket = await new Promise<net.Socket>(
					(resolve, reject) => {
						const candidate = new net.Socket();
						const onConnectError = (err: Error) => {
							candidate.destroy();
							reject(err);
						};

						candidate.once("error", onConnectError);

						candidate.connect(targetPort, targetHost, () => {
							candidate.off("error", onConnectError);
							resolve(candidate);
						});
					}
				);

				this.tcpClient = socket;
				socket.on("error", (err) => {
					if (this._isActive) {
						this.emitError(
							new Error(`TCP socket stream error: ${err.message}`)
						);
					}
				});
				socket.on("close", (hadError) => {
					if (this._isActive && !hadError) {
						this.emitError(
							new Error("TCP socket connection closed unexpectedly.")
						);
					}
				});
				return;
			} catch (error) {
				if (attempt === maxRetries) {
					throw new Error(
						`Failed to connect to ${targetHost}:${String(
							targetPort
						)} after ${String(maxRetries)} attempts: ${
							(error as Error).message
						}`
					);
				}

				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	/**
	 * Forwards data from the data source to the TCP socket.
	 */
	private handleData(data: Buffer): void {
		if (this.tcpClient && !this.tcpClient.destroyed) {
			this.tcpClient.write(data);
		}
	}

	/**
	 * Stops the live trace session.
	 */
	async stop(): Promise<void> {
		if (!this._isActive) {
			return;
		}

		this._isActive = false;

		if (this.dataSource.isOpen) {
			await this.dataSource.close();
		}

		if (this.tcpClient && !this.tcpClient.destroyed) {
			this.tcpClient.end();
			this.tcpClient.destroy();
			this.tcpClient = undefined;
		}
	}

	/**
	 * Disposes of all resources held by the session.
	 */
	dispose(): void {
		void this.stop();
		void this.dataSource.dispose();
		this.errorEmitter.removeAllListeners();
	}

	/**
	 * Emits an error event.
	 * @param error - The error to emit.
	 */
	private emitError(error: Error): void {
		if (this.errorEmitter.listenerCount("error") > 0) {
			this.errorEmitter.emit("error", error);
		}
	}
}
