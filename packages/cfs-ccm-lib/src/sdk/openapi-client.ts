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

// Override the global Request and Response types seen by the openapi-fetch module to those
// provided by node-fetch, this lets use node-fetch-cache with the openapi-fetch client
import { getNodeFetch } from 'node-fetch-cache';
import { Middleware } from 'openapi-fetch';
type NodeFetchRequest = Awaited<
    ReturnType<typeof getNodeFetch>
>['Request'];
type NodeFetchResponse = Awaited<
    ReturnType<typeof getNodeFetch>
>['Response'];

declare module 'openapi-fetch' {
    interface Request extends InstanceType<NodeFetchRequest> {}
    let Request: NodeFetchRequest;
    interface Response extends InstanceType<NodeFetchResponse> {}
    let Response: NodeFetchResponse;
    export type MiddlewareOnRequest =
        Required<Middleware>['onRequest'];
    export type MiddlewareOnResponse =
        Required<Middleware>['onResponse'];
}

import { paths } from '../gen/api-types.js';
import createClient from 'openapi-fetch';
// type for openapi-fetch client so TypeScript will allow us to safely invoke its methods
export type OpenApiClient = ReturnType<typeof createClient<paths>>;
