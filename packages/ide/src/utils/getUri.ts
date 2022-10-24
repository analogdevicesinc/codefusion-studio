/**
 *
 * Copyright (c) 2023 Analog Devices, Inc.
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

import { Uri, Webview } from "vscode";

/**
 * A helper function which will get the webview URI of a given file or resource.
 * @remarks This URI can be used within a webview's HTML as a link to the given file/resource.
 * @param webview - A reference to the extension webview
 * @param extensionUri - The URI of the directory containing the extension
 * @param pathList - An array of strings representing the path to a file/resource
 * @returns A URI pointing to the file/resource
 */

export function getUri(
  webview: Webview,
  extensionUri: Uri,
  pathList: string[]
) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}
