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
import * as vscode from 'vscode';
import type {WebviewPanel} from 'vscode';
import {
	getSoc,
	getSocs,
	getUserHomeDirectory,
	getWorkspaceRoot
} from '../cli';
import {writeConfigFile} from './config-files';

export async function messageHandler(
	message: any,
	panel: WebviewPanel
) {
	let request;

	if (message.type === 'get-socs') {
		request = getSocs();
	} else if (message.type === 'get-soc') {
		request = getSoc(message.body.name as string);
	} else if (message.type === 'get-workspace-root') {
		request = getWorkspaceRoot();
	} else if (message.type === 'get-home-directory') {
		request = getUserHomeDirectory();
	} else if (message.type === 'create-soc-config') {
		try {
			const filePath = message.body.filePath as string;
			const content = message.body.content as Record<string, unknown>;

			const res = await writeConfigFile(filePath, content);

			request = Promise.resolve(res);
		} catch (error) {
			request = Promise.reject(error);
		}
	} else if (message.type === 'select-directory') {
		const result = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false
		});

		request = Promise.resolve(result?.[0].path);
	} else if (message.type === 'close-webview-panel') {
		panel.dispose();
	}

	if (request) {
		const {body, error} = await request.then(
			body => ({body, error: undefined}),
			error => ({body: undefined, error: error?.message})
		);

		// Send result to the webview
		await panel.webview.postMessage({
			type: 'api-response',
			id: message.id,
			body,
			error
		});
	}
}
