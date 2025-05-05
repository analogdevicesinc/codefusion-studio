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
import type {WebviewApi} from 'vscode-webview';
import type {Soc} from './types/soc';
import type {
	ConfiguredPin as Pin,
	ConfiguredClockNode as ClockNode,
	PluginConfig as PluginC,
	ConfiguredPartition as Partition,
	ConfiguredPeripheral as Peripheral,
	ConfiguredProject as Project,
	CfsConfig
} from 'cfs-plugins-api';

export type ConfiguredPin = Pin;

export type ConfiguredClockNode = ClockNode;

export type PluginConfig = PluginC;

export type ConfiguredPartition = Partition;

export type ConfiguredPeripheral = Peripheral;

export type ConfiguredProject = Project;

export type ConfigOptionsReturn = {
	dataModel: Soc;
	configOptions: CfsConfig | undefined;
};

/**
 * API functions for the react app
 */

let vscode: WebviewApi<any> | undefined;

if ((window as any).acquireVsCodeApi instanceof Function) {
	vscode = (window as any).acquireVsCodeApi?.();
}

// Unique message id for each request-response message pair, used to match the response to a specific request
let currentMessageId = 0;

// A list of response handlers for the current pending requests
const pendingResponseHandlers: Record<
	number,
	(body: any, error: any) => void
> = {};

// Listen for window messages and handle the ones that are responses to our own requests
window.addEventListener('message', event => {
	if (event.data.type !== 'api-response') return;

	if (pendingResponseHandlers[event.data.id]) {
		pendingResponseHandlers[event.data.id](
			event.data.body,
			event.data.error
		);

		// eslint-disable-next-line  @typescript-eslint/no-dynamic-delete
		delete pendingResponseHandlers[event.data.id];
	}
});

/**
 * Make a request to the vscode extension
 * Sends a message (the request) and expects a message back (the response)
 * @param {string} type - The type of the request
 * @param {object} [body] - Object containing additional request parameters
 * @returns {Promise<object>}
 */
export async function request(
	type: string,
	body?: Record<string, unknown>
) {
	return new Promise((resolve, reject) => {
		const id = ++currentMessageId;

		// Prepare a response handler
		pendingResponseHandlers[id] = (
			body: Record<string, unknown>,
			error: any
		) => {
			if (error) {
				reject(error);
			} else {
				resolve(body);
			}
		};

		// Send the request to the vscode extension
		vscode?.postMessage({id, type, body});
	});
}

/* --- API functions --- */

// get the list of available soc names
export async function getSocs() {
	return request('get-socs') as Promise<string[]>;
}

// Get details about a specific soc
export async function getSoc(name: string) {
	return request('get-soc', {name}) as Promise<Soc>;
}

export async function getWorkspaceRoot() {
	return request('get-workspace-root') as Promise<string>;
}

export async function getHomeDirectory() {
	return request('get-home-directory') as Promise<string>;
}

export async function createSocConfig(
	filePath: string,
	content: Record<string, unknown>
) {
	return request('create-soc-config', {
		filePath,
		content
	}) as Promise<string>;
}

export async function selectDirectoryPath() {
	return request('select-directory') as Promise<string>;
}

export async function showInformationMessage(message: string) {
	return request('show-information-message', {
		message
	}) as Promise<string>;
}

export async function getIsDocumentUnsaved() {
	return request('get-is-document-unsaved') as Promise<boolean>;
}

export async function showSaveDialog() {
	return request('show-save-dialog') as Promise<string | undefined>;
}

export async function closeWebviewPanel() {
	return request('close-webview-panel') as Promise<void>;
}
