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
import type * as vscode from 'vscode';
import {AbstractViewProvider} from './view-provider-abstract';

export class ViewProviderPanel extends AbstractViewProvider {
	constructor(
		context: vscode.ExtensionContext,
		options?: {
			distDir: string;
			indexPath: string;
		}
	) {
		super(context, {
			distDir: options?.distDir ?? 'build/ui',
			indexPath: options?.indexPath ?? 'build/ui/index.html'
		});
	}

	async resolveWebviewView(
		webviewView: vscode.WebviewPanel,
		commandArgs?: Record<string, unknown>
	) {
		const {webview} = webviewView;

		webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri]
		};

		webview.html = await this.getWebviewHtml(webview, commandArgs);
	}
}