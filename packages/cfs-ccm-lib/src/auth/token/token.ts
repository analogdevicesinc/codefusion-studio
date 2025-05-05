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

import { AuthorizerBase, AuthConfigBase } from '../authorizer.js';
import {
    MiddlewareCallbackParams,
    MiddlewareOnResponse,
} from 'openapi-fetch';

export interface TokenAuthConfig extends Partial<AuthConfigBase> {
    accessToken: string | (() => string);
    refreshHandler?(): string;
}

export class TokenAuthorizer extends AuthorizerBase {
    public static DEFAULT_HTTP_HEADER: string = 'Authorization';
    public static DEFAULT_HTTP_PREFIX: string = 'Bearer ';

    private accessToken: TokenAuthConfig['accessToken'];
    private readonly refresh?: TokenAuthConfig['refreshHandler'];

    /**
     *
     * @param authConfig
     */
    public constructor(authConfig: TokenAuthConfig) {
        super({
            httpHeader:
                authConfig.httpHeader ||
                TokenAuthorizer.DEFAULT_HTTP_HEADER,

            httpPrefix:
                authConfig.httpPrefix ??
                TokenAuthorizer.DEFAULT_HTTP_PREFIX,
        });

        if (
            typeof authConfig.accessToken === 'string' &&
            authConfig.accessToken.length === 0
        ) {
            throw new Error('invalid empty access token');
        }

        this.accessToken = authConfig.accessToken;
        this.refresh = authConfig.refreshHandler;
    }

    /**
     *
     * @param args0
     * @param args0.request
     * @returns
     */
    public async onRequest({ request }: MiddlewareCallbackParams) {
        const accessToken =
            typeof this.accessToken === 'string'
                ? this.accessToken
                : this.accessToken();
        if (
            typeof accessToken === 'string' &&
            accessToken.length > 0
        ) {
            return this.setAuthHeader({ request, auth: accessToken });
        } else {
            throw new Error('invalid empty access token');
        }
    }

    /**
     *
     * @param args0
     * @param args0.response
     * @param args0.request
     * @param args0.options
     * @returns
     */
    public async onResponse({
        response,
        request,
        options,
    }: Parameters<MiddlewareOnResponse>[0]) {
        if (response.status === 401 && this.refresh) {
            // If we weren't authorised and we have a refresh handler, try to refresh the token
            let newToken: string | undefined;
            try {
                newToken = this.refresh();
            } catch (err: unknown) {
                // We should log the error here but return the original response
            }

            if (typeof newToken === 'string' && newToken.length > 0) {
                // Store the new token for future requests
                if (typeof this.accessToken === 'string') {
                    this.accessToken = newToken;
                }

                // retry the request with the new token

                // This is to workaround a bug in openapi-fetch where the options.fetch object is incorrectly typed as globalThis.fetch
                // (https://github.com/openapi-ts/openapi-typescript/blob/30070e5001131e125febe74dfa55c9d1ed34d886/packages/openapi-fetch/src/index.d.ts#L128)
                // when it is actually the custom fetch function we passed in the options
                // (https://github.com/openapi-ts/openapi-typescript/blob/30070e5001131e125febe74dfa55c9d1ed34d886/packages/openapi-fetch/src/index.js#L37)
                const resp = await options.fetch(
                    // This causes TypeScript to believe that options.fetch() needs a globalThis.Request, but since its actually our
                    // node-fetch/node-fetch-cache fetch(), and request is the correct object type, we can cast it to keep TS happy
                    this.setAuthHeader({
                        request,
                        auth: newToken,
                    }) as unknown as Request,
                );

                // This is to workaround another, similar, bug in openapi-fetch where the response object is required to be an instance of globalThis.Response
                // (https://github.com/openapi-ts/openapi-typescript/blob/30070e5001131e125febe74dfa55c9d1ed34d886/packages/openapi-fetch/src/index.js#L144)
                // It looks like this issue was only partially addressed - https://github.com/openapi-ts/openapi-typescript/issues/1563 (only custom Request objects were added)
                // (https://github.com/openapi-ts/openapi-typescript/pull/1907)
                // Therefore we need to create a new globalThis.Response object to return ...
                return new Response(
                    resp.body,
                    resp,
                    // ... but cast it back to the custom response type to keep TS happy
                ) as unknown as typeof response;
            } // else fall through to return the original response with the 401
        }

        // Leaves the response unmodified
        return undefined;
    }
}
