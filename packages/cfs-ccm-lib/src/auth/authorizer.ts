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

import type {
    OpenApiMiddlewareCallbackParams,
    OpenApiMiddlewareOnRequest,
    OpenApiMiddlewareOnResponse,
} from '../sdk/openapi-client.js';

export interface Authorizer {
    onRequest: OpenApiMiddlewareOnRequest;
    onResponse?: OpenApiMiddlewareOnResponse;
}

export interface AuthConfigBase {
    httpHeader: string;
    httpPrefix: string;
}

export abstract class AuthorizerBase implements Authorizer {
    private readonly httpHeader: string;
    private readonly prefix: string;

    protected constructor(authConfig: AuthConfigBase) {
        this.httpHeader = authConfig.httpHeader;
        this.prefix = authConfig.httpPrefix;
    }
    /**
     *
     * @param args0
     * @param args0.request
     * @param _options
     * @returns
     */

    /**
     *
     * @param options
     * @returns
     */
    public onRequest(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options: Parameters<OpenApiMiddlewareOnRequest>[0],
    ): ReturnType<OpenApiMiddlewareOnRequest> {
        // Leaves the request unchanged
        return undefined;
    }

    protected setAuthHeader({
        request,
        auth,
    }: {
        request: OpenApiMiddlewareCallbackParams['request'];
        auth: string;
    }): OpenApiMiddlewareCallbackParams['request'] {
        request.headers.set(this.httpHeader, `${this.prefix}${auth}`);
        return request;
    }
}
