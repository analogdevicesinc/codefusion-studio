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

import envPaths from 'env-paths';
import { Authorizer } from '../auth/index.js';
import { PublicAuthorizer } from '../auth/index.js';
import { OpenApiClient } from './openapi-client.js';
import { LIB_NAME } from '../config/constants.js';
import createClient from 'openapi-fetch';
import { paths } from '../gen/api-types.js';
import { RestClient } from '../gen/rest.js';
import { RequireOptional } from '../types.js';
import NodeFetchCache, {
    FileSystemCache,
    getNodeFetch,
} from 'node-fetch-cache';

let defaultFetch: Awaited<ReturnType<typeof getNodeFetch>>['fetch'];
let NodeFetchRequest: Awaited<
    ReturnType<typeof getNodeFetch>
>['NodeFetchRequest'];
(async () => {
    ({ fetch: defaultFetch, NodeFetchRequest } =
        await getNodeFetch());
})();

export interface ApiOptions {
    // base URL for all API requests
    baseUrl: string | URL;

    // use API Key or Auth Code auth, etc.
    // if not specified, uses public / anonymous access to the API
    authorizer?: Authorizer;

    // whether or not to cache and where to store the cache file;
    // defaults to true, with cache file in OS-appropriate location
    isCache?: boolean;
    cacheDir?: string;
}

const defaultApiOptions: RequireOptional<ApiOptions> = {
    isCache: false, // disable for interim release
    // default cache db file in OS-appropriate location
    cacheDir: envPaths(LIB_NAME, { suffix: '' }).cache,
    // default to public access
    authorizer: new PublicAuthorizer(),
};

// These are the methods of the openapi-client that we want to expose
// publicly through the apiclient fetch property
const FetchProxyMethods = ['GET', 'PUT', 'POST', 'DELETE'] as const;
type FetchProxyMethod = (typeof FetchProxyMethods)[number];
function isFetchProxyMethod(
    method: string,
): method is FetchProxyMethod {
    return (FetchProxyMethods as readonly string[]).includes(method);
}
type FetchClient = Pick<OpenApiClient, FetchProxyMethod>;

/**
 * Client for the CFS software catalog API.
 *
 * Usage:
 * ------
 * ```
 * const myClient = new CfsApiClient({
 *     baseUrl: 'http://www.myapi.com',
 *     authorizer: myAuth,
 * });
 * ```
 * Typically used with `SocCatalog`; see that class for further usage information.
 */
export class CfsApiClient {
    #restClient?: RestClient;
    #fetchProxy?: FetchClient;
    private openapiClient: OpenApiClient;

    /**
     * Constructs a new CfsApiClient instance.
     * @param options - The options for configuring the API client.
     */
    public constructor(options: ApiOptions) {
        const opts = { ...defaultApiOptions, ...options };
        let nodeFetch;
        if (opts.isCache) {
            nodeFetch = NodeFetchCache.create({
                cache: new FileSystemCache({
                    cacheDirectory: opts.cacheDir,
                }),
            });
        } else {
            nodeFetch = defaultFetch;
        }

        // Validate the base URL
        const baseUrl = new URL(opts.baseUrl).toString();

        this.openapiClient = createClient<paths>({
            baseUrl,
            fetch: nodeFetch,
            Request: NodeFetchRequest,
        });
        if (opts.authorizer) {
            this.openapiClient.use(opts.authorizer);
        }
    }

    /**
     * Checks if the API is reachable.  Does not require authentication.
     * To check if the client is authorized, use `testConnection`.
     * Returns false if the connection fails.
     * @param timeout The maximum amount of time in milliseconds the client will spend trying to connect. Setting to 0 will disable the timeout.
     * @returns Returns true if the client successfully reached the service, or false if it failed for any reason.
     */
    public async isOnline(timeout = 0): Promise<boolean> {
        try {
            const { error } = await this.openapiClient.GET('/ping', {
                parseAs: 'text',
                signal:
                    timeout > 0
                        ? AbortSignal.timeout(timeout)
                        : undefined,
            });

            // service is online if no error was returned
            return error === undefined;
        } catch {
            // in case of local error - DNS failure, timeout, etc.
            return false;
        }
    }

    /**
     * Checks if the client can communicate with the API.
     * Throws an error if the connection fails for any reason (including authorization).
     * @param timeout The maximum amount of time in milliseconds the client will spend trying to connect. Setting to 0 will disable the timeout.
     * @throws An error if the client is unable to connect to the API.
     */
    public async testConnection(timeout = 0): Promise<void> {
        const { error } = await this.fetch.GET('/pingAuth', {
            signal:
                timeout > 0
                    ? AbortSignal.timeout(timeout)
                    : undefined,
        });

        if (error) {
            throw error;
        }
    }

    /**
     * Gets the REST client for making API requests.
     * @returns The REST client.
     */
    public get rest(): RestClient {
        this.#restClient ??= new RestClient(this.openapiClient);
        return this.#restClient;
    }

    /**
     * Gets the fetch client for making API requests, exclusively for CRUD methods.
     * @returns The fetch client.
     */
    public get fetch(): FetchClient {
        this.#fetchProxy ??= new Proxy(this.openapiClient, {
            get: function (target: OpenApiClient, prop: string) {
                if (isFetchProxyMethod(prop)) {
                    return target[prop];
                }
            },
        });
        return this.#fetchProxy;
    }
}
