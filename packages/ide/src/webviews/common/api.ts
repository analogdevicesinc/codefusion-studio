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
} from 'cfs-types';
import {messenger} from './contexts/MessengerContext';
import {webviewApiBridge} from './test-utils/messenger-mock';
import {
	checkDirectoryExistsRequest,
	getFileSizeRequest,
	getPreferenceRequest,
	openFileNotification,
	reloadDocumentNotification,
	selectFileRequest,
	setPreferenceRequest,
	showInformationMessageNotification,
	type SelectFileRequestOptions
} from '../../constants/messages/vscode-api-messages';
import type {ConfigurationTargetValue} from '../../types/vscode-api-types';

export type ConfiguredPin = Pin;

export type ConfiguredClockNode = ClockNode;

export type PluginConfig = PluginC;

export type ConfiguredPartition = Partition;

export type ConfiguredPeripheral = Peripheral;

export type ConfiguredProject = Project;

export type ConfigOptionsReturn = {
	dataModel: Soc;
	configOptions: CfsConfig | undefined;
	resolvedPluginVersions?: Record<string, string>;
};

/**
 * API functions for the react app
 */

// Use the shared lazy bridge so this module and MessengerContext can both
// reach the vscode webview API without competing over the single-use
// acquireVsCodeApi() call.
let vscode: WebviewApi<any> = webviewApiBridge as WebviewApi<any>;

export function mockVsCodeApi(mockImplementation: WebviewApi<any>) {
	vscode = mockImplementation;
}

/**
 * Signal to the extension that the SEV webview is ready to receive data
 */
export function signalReady() {
	vscode?.postMessage({type: 'sev-ready'});
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
	messenger.sendNotification(
		showInformationMessageNotification,
		{type: 'extension'},
		{message}
	);
}

export async function closeWebviewPanel() {
	return request('close-webview-panel') as Promise<void>;
}

export async function openFile(filePath: string, editor?: string) {
	messenger.sendNotification(
		openFileNotification,
		{type: 'extension'},
		{filePath, editor}
	);
}

export async function documentReload() {
	messenger.sendNotification(reloadDocumentNotification, {
		type: 'extension'
	});
}

export async function selectFile(
	options: {
		canSelectFolders?: boolean;
		title?: string;
		filters?: Record<string, string[]>;
		relativeToWorkspaceRoot?: boolean;
	} = {}
) {
	const payload: SelectFileRequestOptions = {
		title: options.title,
		filters: options.filters,
		relativeToWorkspaceRoot: options.relativeToWorkspaceRoot,
		selectionTarget: options.canSelectFolders ? 'folder' : 'file'
	};

	return messenger.sendRequest(
		selectFileRequest,
		{type: 'extension'},
		payload
	);
}

export async function checkDirectoryExists(dirPath: string) {
	return messenger.sendRequest(
		checkDirectoryExistsRequest,
		{type: 'extension'},
		dirPath
	);
}

export async function getFileSize(filePath: string) {
	return messenger.sendRequest(
		getFileSizeRequest,
		{type: 'extension'},
		{filePath}
	);
}

/**
 * Gets a vscode preference in the cfs scope. Meaning you can drop the first cfs from the id
 * @param id preference id
 * @returns the preference value
 */
export async function getPreference(id: string) {
	return messenger.sendRequest(
		getPreferenceRequest,
		{type: 'extension'},
		{id}
	);
}

/**
 * Sets a vscode preference in the cfs scope
 * @param scope correlates to vscode.ConfigurationTarget
 * - 1: Global
 * - 2: Workspace
 * - 3: Workspace Folder
 */
export async function setPreference(
	id: string,
	value: any,
	scope?: ConfigurationTargetValue
) {
	return messenger.sendRequest(
		setPreferenceRequest,
		{type: 'extension'},
		{id, value, scope}
	);
}
