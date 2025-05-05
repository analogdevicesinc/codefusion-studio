/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

export abstract class CfsCcmError<T extends string> extends Error {
    type: T;
    cause?: unknown;

    /**
     * Creates a new CfsCcmError.
     * @param args0 The error object
     * @param args0.cause The cause of the error (typically an exception to wrap)
     * @param args0.message The error message to display
     * @param args0.type The error type (used for categorization)
     */
    constructor({
        cause,
        message,
        type,
    }: {
        cause?: unknown;
        message: string;
        type: T;
    }) {
        super(message);
        this.type = type;
        if (cause) {
            this.cause = cause;
        }
    }
}
