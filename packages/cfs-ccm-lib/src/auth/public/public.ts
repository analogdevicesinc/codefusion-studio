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

export interface PublicAuthConfig extends Partial<AuthConfigBase> {
    publicUser?: string;
}

export class PublicAuthorizer extends AuthorizerBase {
    public static DEFAULT_HTTP_HEADER: string = 'Cfs-User';
    public static DEFAULT_HTTP_PREFIX: string = '';
    public static DEFAULT_PUBLIC_USER: string = 'ANONYMOUS';

    private readonly publicUser: string;

    /**
     *
     * @param authConfig
     */
    public constructor(authConfig?: PublicAuthConfig) {
        super({
            httpHeader:
                authConfig?.httpHeader ||
                PublicAuthorizer.DEFAULT_HTTP_HEADER,
            httpPrefix:
                authConfig?.httpPrefix ??
                PublicAuthorizer.DEFAULT_HTTP_PREFIX,
        });

        this.publicUser =
            authConfig?.publicUser ||
            PublicAuthorizer.DEFAULT_PUBLIC_USER;
    }

    /**
     *
     * @param args0
     * @param args0.request
     * @returns
     */
    public async onRequest({ request }: MiddlewareCallbackParams) {
        return this.setAuthHeader({ request, auth: this.publicUser });
    }
}
