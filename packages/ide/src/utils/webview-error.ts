/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
export class WebviewError extends Error {
  readonly type: string;
  readonly body: unknown;

  constructor(type: string, message: string, body?: unknown) {
    super(message);
    this.name = "WebviewError";
    this.type = type;
    this.body = body;
  }

  static missingPluginsError(plugins: { id: string; version: string }[]) {
    return new WebviewError("missing-plugins", "Missing plugins", plugins);
  }

  static dataModelError(dataModel: {
    soc: string;
    pkg: string;
    version: string;
  }) {
    return new WebviewError(
      "data-model",
      "Invalid or missing data model",
      dataModel,
    );
  }

  static fromUnknown(error: unknown): WebviewError {
    if (error instanceof WebviewError) return error;
    if (error instanceof Error) {
      return new WebviewError("exception", error.message, {
        name: error.name,
        stack: error.stack,
      });
    }
    return new WebviewError("unknown", String(error));
  }
}

export type WebviewErrorPayload = {
  type: string;
  body: unknown;
};

export function toWebviewErrorPayload(error: unknown): WebviewErrorPayload {
  const parsed = WebviewError.fromUnknown(error);
  return { type: parsed.type, body: parsed.body };
}
