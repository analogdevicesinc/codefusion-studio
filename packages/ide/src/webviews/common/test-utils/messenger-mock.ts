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

import {type WebviewApi} from 'vscode-webview';

// Cache the API instance after calling acquireVsCodeApi() once.
// In tests, wait for setupMessengerMock() to set up the mock before initializing.
let cachedApi: WebviewApi<any> | undefined;

function getVsCodeApi() {
	if (!cachedApi && window.acquireVsCodeApi) {
		cachedApi = window.acquireVsCodeApi();
	}

	return cachedApi;
}

export const webviewApiBridge = {
	postMessage(message: unknown) {
		getVsCodeApi()?.postMessage(message);
	},
	getState<T>() {
		return getVsCodeApi()?.getState() as T | undefined;
	},
	setState<T>(newState: T) {
		getVsCodeApi()?.setState(newState);
	}
};

type MessageHandler = ((message: any) => any) | any;

/**
 * Sets up a mock for `window.acquireVsCodeApi` with per-method response
 * handlers. Call this in a `before` or `beforeEach` block.
 *
 * @param handlers - A map of message method names to either a static return
 *   value or a handler function. Functions receive the raw message and should
 *   return the result to send back. Use `undefined` to send no response.
 *
 * @example
 * setupMessengerMock({
 *   'get-report': myReport,
 *   'get-layer-data': (msg) => ({ columns: [...], rows: [...] }),
 * });
 */
export function setupMessengerMock(
	handlers: Record<string, MessageHandler> = {}
): void {
	window.acquireVsCodeApi = () => ({
		postMessage(message: any) {
			const handler = handlers[message.method];

			if (handler !== undefined) {
				const result =
					typeof handler === 'function' ? handler(message) : handler;

				if (result !== undefined) {
					sendMockResponse(message, result);
				}
			}
		},
		getState: () => undefined,
		setState: <T>() => undefined as T
	});
}

function sendMockResponse(message: any, result: any) {
	window.dispatchEvent(
		new MessageEvent('message', {
			data: {
				id: message.id,
				result,
				receiver: {}
			}
		})
	);
}

export function sendMockMessage(type: string, params?: any) {
	window.dispatchEvent(
		new MessageEvent('message', {
			data: {
				method: type,
				params,
				receiver: {}
			}
		})
	);
}
