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

// Call acquireVsCodeApi() exactly once and cache the result.
// In VS Code webviews, acquireVsCodeApi() is single-use; calling it multiple times
// can return a different object or throw, making the mock unreliable.
let cachedApi: WebviewApi<any> | undefined;

function getVsCodeApi(): WebviewApi<any> | undefined {
	if (!cachedApi && window.acquireVsCodeApi) {
		cachedApi = window.acquireVsCodeApi();
	}

	return cachedApi;
}

export const webviewApiBridge = {
	postMessage(message: unknown) {
		// When there is no host (e.g. Cypress component tests without a
		// messenger mock), behave as a no-op instead of throwing. This
		// preserves the pre-migration contract where requests sent without a
		// vscode API simply never settle rather than rejecting synchronously.
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
 * Sentinel a handler can return to keep a request pending: the mock sends
 * nothing, leaving the caller's promise unsettled until the test responds with
 * {@link sendMockResponse} or {@link sendMockErrorResponse}. Needed to observe
 * loading states and to order concurrent responses independently of the order
 * they were requested in.
 */
export const NO_RESPONSE = Symbol('no-response');

/**
 * Sets up a mock for `window.acquireVsCodeApi` with per-method response
 * handlers. Call this in a `before` or `beforeEach` block.
 *
 * @param handlers - A map of message method names to either a static return
 *   value or a handler function. Functions receive the raw message and should
 *   return the result to send back. Return {@link NO_RESPONSE} to leave the
 *   request unanswered, and settle it later with {@link sendMockResponse} or
 *   {@link sendMockErrorResponse}.
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
	const handlePostMessage = (message: any) => {
		if (message.method in handlers) {
			const handler = handlers[message.method];

			let result: any;

			try {
				result =
					typeof handler === 'function' ? handler(message) : handler;

				// Only send a response if the message has an id (i.e., it's a request).
				// Notifications do not include an id and should not trigger a response.
				// A handler that returned NO_RESPONSE answers on its own schedule.
				if (message.id !== undefined && result !== NO_RESPONSE) {
					sendMockResponse(message, result);
				}
			} catch (err) {
				// Only send error response if the message has an id.
				if (message.id !== undefined) {
					sendMockErrorResponse(
						message,
						err instanceof Error ? err.message : String(err)
					);
				}
			}
		} else if (message.id !== undefined) {
			// Only send error if the message has an id and a handler was expected.
			sendMockErrorResponse(
				message,
				`No handler for message method: ${message.method}`
			);
		}
	};

	const mockApi = {
		postMessage: handlePostMessage,
		getState: () => undefined,
		setState: <T>() => undefined as T
	};

	// Patch or set acquireVsCodeApi, storing the mock instance once.
	// This ensures the same object is used for all postMessage intercepts.
	if (typeof window.acquireVsCodeApi === 'undefined') {
		// Otherwise, provide the mock as acquireVsCodeApi.
		window.acquireVsCodeApi = () => mockApi;
	} else {
		// If acquireVsCodeApi already exists, retrieve the cached API instance
		// and update its postMessage method.
		const existingApi = getVsCodeApi();

		if (existingApi) {
			existingApi.postMessage = handlePostMessage;
		}
	}
}

export function sendMockResponse(message: any, result: any) {
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

export function sendMockErrorResponse(
	message: any,
	errorMessage: string | {message: string; data?: unknown}
) {
	window.dispatchEvent(
		new MessageEvent('message', {
			data: {
				id: message.id,
				error: errorMessage,
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
