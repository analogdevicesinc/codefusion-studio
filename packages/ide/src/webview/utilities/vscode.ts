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

import type { WebviewApi } from "vscode-webview";

/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing and state management between the webview and extension
 * contexts.
 */
class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    // Check if the acquireVsCodeApi function exists in the current development
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * Post a message to the owner of the webview.
   * @remarks When running webview code inside a web browser, postMessage will instead log the given message to the console.
   * @param message- Arbitrary data (must be JSON serializable) to send to the extension context.
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log(message);
    }
  }

  /**
   * Get the persistent state stored for this webview.
   * @remarks When running webview source code inside a web browser, getState will retrieve state from local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   * @returns The current state or `undefined` if no state has been set.
   */
  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem("vscodeState");
      return state ? JSON.parse(state) : undefined;
    }
  }

  /**
   * Set the persistent state stored for this webview.
   * @remarks When running webview source code inside a web browser, setState will set the given state using local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   * @param newState- New persisted state. This must be a JSON serializable object. Can be retrieved using {@link getState}.
   * @returns The new state.
   */
  public setState<T extends unknown | undefined>(newState: T): T {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem("vscodeState", JSON.stringify(newState));
      return newState;
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
