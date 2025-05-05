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

import { MiddlewareCallbackParams } from 'openapi-fetch';
import { AuthorizerBase, AuthConfigBase } from '../authorizer.js';

export interface ApiKeyAuthConfig extends Partial<AuthConfigBase> {
    apiKey: string | (() => string);
}

export class ApiKeyAuthorizer extends AuthorizerBase {
    public static DEFAULT_HTTP_HEADER: string = 'X-Api-Key';
    public static DEFAULT_HTTP_PREFIX: string = '';

    private readonly apiKey: ApiKeyAuthConfig['apiKey'];

    /**
     *
     * @param authConfig
     */
    public constructor(authConfig: ApiKeyAuthConfig) {
        super({
            httpHeader:
                authConfig.httpHeader ||
                ApiKeyAuthorizer.DEFAULT_HTTP_HEADER,
            httpPrefix:
                authConfig.httpPrefix ??
                ApiKeyAuthorizer.DEFAULT_HTTP_PREFIX,
        });

        if (
            typeof authConfig.apiKey === 'string' &&
            authConfig.apiKey.length === 0
        ) {
            throw new Error('invalid empty API key');
        }

        this.apiKey = authConfig.apiKey;
    }

    /**
     *
     * @param args0
     * @param args0.request
     * @returns
     */
    public async onRequest({ request }: MiddlewareCallbackParams) {
        const apiKey =
            typeof this.apiKey === 'string'
                ? this.apiKey
                : this.apiKey();
        if (typeof apiKey === 'string' && apiKey.length > 0) {
            return this.setAuthHeader({ request, auth: apiKey });
        } else {
            throw new Error('invalid empty API key');
        }
    }
}
