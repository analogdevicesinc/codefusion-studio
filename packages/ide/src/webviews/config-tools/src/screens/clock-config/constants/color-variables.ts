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
export const colorVariablesIds: Readonly<Record<string, string>> = {
	foreground: '--vscode-editor-foreground',
	background: '--vscode-editor-background',
	inactiveBorder: '--vscode-notificationToast-border',
	clockStroke: '--vscode-editor-foreground',
	error: '--vscode-notificationsErrorIcon-foreground'
};

export const fallbackColors: Readonly<Record<string, string>> = {
	'--vscode-editor-foreground': '#7f7f7f',
	'--vscode-editor-background': '#1e1e1e',
	'--vscode-notificationsErrorIcon-foreground': '#f14c4c',
	'--vscode-notificationToast-border': '#3C3C3C'
};
