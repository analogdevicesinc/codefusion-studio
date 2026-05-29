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

/* This file is generated automatically ! Manual edits will be overwritten */

export interface paths {
    '/coretypes': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists Core Types
         * @description Returns a list of all the supported Core Types
         */
        get: {
            parameters: {
                query?: {
                    /** @description Continuation token from previous response */
                    continue?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListCoreTypeOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Creates a new Core Type
         * @description Creates a new Core type
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the Core Type to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateCoreTypeRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['coretype.CreateOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/coretypes/{coreTypeID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a Core Type
         * @description Returns a Core Type
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Core Type to return */
                    coreTypeID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['coretype.GetCoreTypeOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete Core Type
         * @description Deletes a Core Type
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the Core Type to be deleted */
                    coreTypeID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch Core Type
         * @description Patches a Core Type
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the Core Type to be patched */
                    coreTypeID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Core Type to be patched */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchCoreTypeRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['coretype.UpdateCoreTypeOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/docs/{file}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Download API docs
         * @description Returns the API spec as a swagger or OpenAPI 3 JSON file
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description File to download */
                    file: 'swagger.json' | 'openapi.json';
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': string;
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/ping': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Ping
         * @description Reports API availability
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Healthy Connection */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'text/plain': string;
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'text/plain': string;
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/pingAuth': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * PingAuth
         * @description Responds "Pong!" to an authorized caller
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pong! */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': string;
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/resources': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists Resources
         * @description Returns a list of Resources
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filter by compatible CFS version (semver or *) */
                    cfsVersion?: string;
                    /** @description Continuation token from previous response */
                    continue?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListResourcesOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create Resource
         * @description Creates a new Resource
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the resource to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateResourceRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['resource.CreateResourceOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/resources/{resourceID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a Resource
         * @description Returns a Resource
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filter by compatible CFS version (semver or *) */
                    cfsVersion?: string;
                };
                header?: never;
                path: {
                    /** @description The ID of the Resource to return */
                    resourceID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['resource.GetResourceOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        /**
         * Update Resource
         * @description Updates a resource
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the resource to be updated */
                    resourceID: string;
                };
                cookie?: never;
            };
            /** @description Resource object to be updated */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.UpdateResourceRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['resource.UpdateResourceOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        post?: never;
        /**
         * Delete Resource
         * @description Deletes a Resource
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the resource to be deleted */
                    resourceID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/socfamilies': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists SoC Families
         * @description Returns a list of all the known SoC Families
         */
        get: {
            parameters: {
                query?: {
                    /** @description Continuation token from previous response */
                    continue?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListSoCFamiliesOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Creates a new SoC Family
         * @description Creates a new SoC Family
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the SoC Family to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateSoCFamilyRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['socfamily.CreateOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/socfamilies/{socFamilyID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a SoC Family
         * @description Returns a SoC Family
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the SoC Family to return */
                    socFamilyID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['socfamily.GetSoCFamilyOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete SoC Family
         * @description Deletes a SoC Family
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the SoC Family to be deleted */
                    socFamilyID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch SoC Family
         * @description Patches a SoC Family
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the SoC Family to be patched */
                    socFamilyID: string;
                };
                cookie?: never;
            };
            /** @description Details of the SoC Family to be patched */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchSoCFamilyRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['socfamily.UpdateSoCFamilyOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/socs': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists SoCs
         * @description Returns a list of SoCs
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filter by compatible CFS version (semver or *) */
                    cfsVersion?: string;
                    /** @description Continuation token from previous response */
                    continue?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListSoCsOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create a SoC
         * @description Creates a new SoC
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the SoC to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateSoCRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.CreateOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/socs/{socID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Gets a SoC by ID
         * @description Returns an SoC object with all its child components by its ID
         */
        get: {
            parameters: {
                query?: {
                    /** @description Filter by compatible CFS version (semver or *) */
                    cfsVersion?: string;
                };
                header?: never;
                path: {
                    /** @description The ID of the SoC to return */
                    socID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.GetSoCOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Deletes a SoC by ID
         * @description Deletes an SoC object and all its child components by its ID
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the SoC to delete */
                    socID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch a SoC
         * @description Patches an existing SoC
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the SoC to patch */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the SoC properties to be updated */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchSoCRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.UpdateSoCOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/socs/{socID}/boards': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add a new Board to SoC
         * @description Adds a new Board to SoC
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the SoC the Board should be added to */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Board to be added to the SoC */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.AddBoardRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.AddBoardOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/socs/{socID}/boards/{boardID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete an existing Board from SoC
         * @description Deletes an existing Board from SoC
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Board to be deleted */
                    boardID: string;
                    /** @description The ID of the SoC containing the Board to be deleted */
                    socID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch an existing Board in SoC
         * @description Patches an existing Board in SoC
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Board to be patched */
                    boardID: string;
                    /** @description The ID of the SoC containing the Board to be patched */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Board to be patched in the SoC */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchBoardRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.UpdateBoardOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/socs/{socID}/cores': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add a new Core to SoC
         * @description Adds a new Core to SoC
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the SoC the Core should be added to */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Core to be added to the SoC */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.AddCoreRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.AddCoreOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/socs/{socID}/cores/{coreID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete an existing Core from SoC
         * @description Deletes an existing Core from SoC
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Core to be deleted */
                    coreID: string;
                    /** @description The ID of the SoC containing the Core to be deleted */
                    socID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch an existing Core in SoC
         * @description Patches an existing Core in SoC
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Core to be patched */
                    coreID: string;
                    /** @description The ID of the SoC containing the Core to be patched */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Core to be patched in the SoC */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchCoreRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.UpdateCoreOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/socs/{socID}/packages': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add a new Package to SoC
         * @description Adds a new Package to SoC
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the SoC the Package should be added to */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Package to be added to the SoC */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.AddPackageRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.AddPackageOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/socs/{socID}/packages/{packageID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete an existing Package from SoC
         * @description Deletes an existing Package from SoC
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Package to be deleted. Must not be associated with any Board. */
                    packageID: string;
                    /** @description The ID of the SoC containing the Package to be deleted. */
                    socID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch an existing Package in SoC
         * @description Patches an existing Package in SoC
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description The ID of the Package to be patched */
                    packageID: string;
                    /** @description The ID of the SoC containing the Package to be patched */
                    socID: string;
                };
                cookie?: never;
            };
            /** @description Details of the Package to be patched in the SoC */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchPackageRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['soc.UpdatePackageOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/sw/packages/eulas/accept': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record a user's acceptance of an EULA for a specific software package version
         * @description Records that the user has accepted the EULA for the specified software package version
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the EULA acceptance to be recorded */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.AcceptEULARequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/sw/packages/repos': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists SWPackageRepos
         * @description Returns a list of software package repositories
         */
        get: {
            parameters: {
                query?: {
                    /** @description Continuation token from previous response */
                    continue?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListSWPackageReposOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/sw/packages/tags': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists SWPackageTags
         * @description Returns a list of software package tags
         */
        get: {
            parameters: {
                query?: {
                    /** @description Continuation token from previous response */
                    continue?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListSWPackageTagsOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create SwPackageTag
         * @description Creates a new software package tag
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the software package tag to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateSWPackageTagRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['swpackagetag.CreateSWPackageTagOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/sw/packages/tags/{tagID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete SWPackageTag
         * @description Deletes a software package tag
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the software package tag to be deleted */
                    tagID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Patch SWPackageTag
         * @description Patches a software package tag
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the software package tag to be patched */
                    tagID: string;
                };
                cookie?: never;
            };
            /** @description Details of the software package tag to be patched */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.PatchSWPackageTagRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['swpackagetag.UpdateSWPackageTagOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        trace?: never;
    };
    '/users': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists Users
         * @description Returns a list of Users
         */
        get: {
            parameters: {
                query?: {
                    /** @description Return only stored user data, otherwise derive values (such as tags) from defaults */
                    stored?: boolean;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListUsersOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create User
         * @description Creates a new user
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the user to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateUserRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['user.CreateUserOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/users/{userID}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a User by ID or email
         * @description Returns a User
         */
        get: {
            parameters: {
                query?: {
                    /** @description Return only stored user data, otherwise derive values (such as tags) from defaults */
                    stored?: boolean;
                };
                header?: never;
                path: {
                    /** @description ID or email of the user to be retrieved */
                    userID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['user.GetUserOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        /**
         * Update User
         * @description Updates a user key
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID or email of the user to be updated */
                    userID: string;
                };
                cookie?: never;
            };
            /** @description User object to be updated */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.UpdateUserRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['user.UpdateUserOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        post?: never;
        /**
         * Delete User
         * @description Deletes a user
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID or email of the user to be deleted */
                    userID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/users/entitlements': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Entitlements
         * @description Lists all entitlements managed by CCM, optionally filtered by entitlement type and/or repository URL, with pagination support.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Pagination token */
                    continue?: string;
                    /** @description Filter by entitlement type */
                    entitlementType?: 'PACKAGE_REPO_TOKEN';
                    /** @description Filter by repository URL */
                    repoUrl?: string;
                    /** @description Filter by user email or ID */
                    userID?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListEntitlementsResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Request an Entitlement for a user
         * @description Requests an Entitlement for the user. Include the previous token to refresh it.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the Entitlement to be created or refreshed */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.EntitlementRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.EntitlementResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/users/entitlements/{entitlementID}/disable': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Disable an Entitlement by ID (Admin)
         * @description Disable an Entitlement and sync its state with the remote provider
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the Entitlement to disable */
                    entitlementID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['entitlement.UpdateEntOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/users/entitlements/{entitlementID}/enable': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enable an Entitlement by ID (Admin)
         * @description Enable an Entitlement and sync its state with the remote provider
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the Entitlement to enable */
                    entitlementID: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['entitlement.UpdateEntOutput'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Not Found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/users/keys': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Lists Users Keys
         * @description Returns a list of Users Keys
         */
        get: {
            parameters: {
                query?: {
                    /** @description User ID or email to list keys for */
                    userID?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.ListAPIKeysOutput'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        put?: never;
        /**
         * Create User Key
         * @description Creates a new user key
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** @description Details of the key to be created */
            requestBody: {
                content: {
                    'application/json': components['schemas']['main.CreateAPIKeyRequest'];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['main.CreateAPIKeyResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    '/users/keys/{appKey}': {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete User Key
         * @description Deletes a user key
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @description ID of the user key to be deleted */
                    appKey: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
                /** @description Internal Server Error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        'application/json': components['schemas']['anvilhttp.GenericResponse'];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        'anvilhttp.GenericResponse': {
            /** @description A generic response object. This can be information related to a successful or failed request. */
            message?: string;
        };
        'coretype.CreateOutput': {
            item: components['schemas']['types.CoreType'];
        };
        'coretype.GetCoreTypeOutput': {
            item: components['schemas']['types.CoreType'];
        };
        'coretype.UpdateCoreTypeOutput': {
            item?: components['schemas']['types.CoreType'];
        };
        'entitlement.UpdateEntOutput': {
            item: components['schemas']['types.Entitlement'];
        };
        'main.AcceptEULARequest': {
            /** Format: ISO8601 */
            acceptedAt: string;
            /** Format: semver */
            clientVersion: string;
            packageName: string;
            /** Format: semver */
            packageVersion: string;
        };
        'main.AddBoardRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            /**
             * Format: semver_constraint
             * @example >=1.0.0, <2.0.0
             */
            cfsVersionConstraint?: string;
            description: string;
            /** Format: typeid */
            id?: string;
            name: string;
            packageIDs: string[];
            productUrl?: string;
        };
        'main.AddCoreRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            coreType: components['schemas']['soc.CreateInputCoreType'];
            dataModelCoreID: string;
            description?: string;
            extensions: string[];
            /** Format: typeid */
            id?: string;
            name: string;
            primary?: boolean;
            supportsAI?: boolean;
            supportsTrustZone?: boolean;
        };
        'main.AddPackageRequest': {
            /**
             * Format: semver_constraint
             * @example >=1.0.0, <2.0.0
             */
            cfsVersionConstraint?: string;
            dataModelPackageID?: string;
            description: string;
            /** Format: typeid */
            id?: string;
            name: string;
            /** @enum {string} */
            packageType:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED'
                | 'EWLB'
                | 'LFCSP'
                | 'LGA';
        };
        'main.CreateAPIKeyRequest': {
            description?: string;
            readTags: string[];
            /** @enum {string} */
            role: 'user' | 'admin';
            writeTags: string[];
        };
        'main.CreateAPIKeyResponse': {
            item: components['schemas']['types.APIKey'];
        };
        'main.CreateCoreTypeRequest': {
            /** @description x86, arm, mips */
            architecture: string;
            /** @description optional */
            description?: string;
            /** Format: typeid */
            id?: string;
            /** @description x86_64, armv7, mips32 */
            isa: string;
        };
        'main.CreateResourceRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            /**
             * Format: semver_constraint
             * @example >=1.0.0, <2.0.0
             */
            cfsVersionConstraint?: string;
            /** Format: typeid */
            id?: string;
            /** @enum {string} */
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'main.CreateSoCFamilyRequest': {
            /** Format: typeid */
            id?: string;
            name: string;
        };
        'main.CreateSoCRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            boards?: components['schemas']['soc.CreateInputBoard'][];
            /**
             * Format: semver_constraint
             * @example >=1.0.0, <2.0.0
             */
            cfsVersionConstraint?: string;
            cores: components['schemas']['soc.CreateInputCore'][];
            description: string;
            documentation?: components['schemas']['types.Documentation'][];
            family: components['schemas']['soc.CreateInputFamily'];
            /** Format: typeid */
            id?: string;
            media?: components['schemas']['types.Media'][];
            name: string;
            packages?: components['schemas']['soc.CreateInputPackage'][];
            supportsMCUboot?: boolean;
        };
        'main.CreateSWPackageTagRequest': {
            accessTag: components['schemas']['types.AccessTag'];
            description?: string;
            packageTag: string;
            repoUrl: string;
        };
        'main.CreateUserRequest': {
            /** Format: email */
            email: string;
            readTags: string[];
            /** @enum {string} */
            userType: 'user' | 'admin';
            writeTags: string[];
        };
        'main.EntitlementRequest': {
            /** @enum {string} */
            entitlementType: 'PACKAGE_REPO_TOKEN';
            repoUrl: string;
            /** @description Pass existing token to refresh the entitlement */
            token?: string;
        };
        'main.EntitlementResponse': {
            /** @enum {string} */
            entitlementType: 'PACKAGE_REPO_TOKEN';
            repoUrl: string;
            token: string;
        };
        'main.ListAPIKeysOutput': {
            count: number;
            items: components['schemas']['types.APIKey'][];
        };
        'main.ListCoreTypeOutput': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.CoreType'][];
        };
        'main.ListEntitlementsResponse': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.Entitlement'][];
        };
        'main.ListResourcesOutput': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.Resource'][];
        };
        'main.ListSoCFamiliesOutput': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.SoCFamily'][];
        };
        'main.ListSoCsOutput': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.SoC'][];
        };
        'main.ListSWPackageReposOutput': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.SWPackageRepo'][];
        };
        'main.ListSWPackageTagsOutput': {
            continuationToken?: string;
            count: number;
            items: components['schemas']['types.SWPackageTag'][];
        };
        'main.ListUsersOutput': {
            count: number;
            items: components['schemas']['mainmodule_internal_pkg_types.User'][];
        };
        'main.PatchBoardRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string | null;
            description?: string;
            name?: string;
            packageIDs?: string[];
            productUrl?: string | null;
        };
        'main.PatchCoreRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string | null;
            coreType?: components['schemas']['soc.UpdateCoreType'];
            dataModelCoreID?: string;
            description?: string;
            extensions?: string[];
            name?: string;
            primary?: boolean;
            supportsAI?: boolean | null;
            supportsTrustZone?: boolean | null;
        };
        'main.PatchCoreTypeRequest': {
            architecture?: string;
            description?: string;
            isa?: string;
        };
        'main.PatchPackageRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string | null;
            dataModelPackageID?: string | null;
            description?: string;
            name?: string;
            /** @enum {string} */
            packageType?:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED'
                | 'EWLB'
                | 'LFCSP'
                | 'LGA';
        };
        'main.PatchSoCFamilyRequest': {
            name?: string;
        };
        'main.PatchSoCRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            /**
             * Format: semver_constraint
             * @example >=1.0.0, <2.0.0
             */
            cfsVersionConstraint?: string;
            description?: string;
            documentation?: components['schemas']['types.Documentation'][];
            media?: components['schemas']['types.Media'][];
            name?: string;
            supportsMCUboot?: boolean | null;
        };
        'main.PatchSWPackageTagRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            description?: string;
            packageTag?: string;
        };
        'main.UpdateResourceRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            /**
             * Format: semver_constraint
             * @example >=1.0.0, <2.0.0
             */
            cfsVersionConstraint?: string;
            /** @enum {string} */
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'main.UpdateUserRequest': {
            readTags: string[];
            /** @enum {string} */
            userType: 'user' | 'admin';
            writeTags: string[];
        };
        'mainmodule_internal_pkg_types.User': {
            accessTag: components['schemas']['types.AccessTag'];
            /** Format: email */
            email?: string;
            id: string;
            /** Format: email */
            maskedEmail: string;
            /** @enum {string} */
            userType: 'user' | 'admin';
        };
        'resource.CreateResourceOutput': {
            item: components['schemas']['types.Resource'];
        };
        'resource.GetResourceOutput': {
            item: components['schemas']['types.Resource'];
        };
        'resource.UpdateResourceOutput': {
            item: components['schemas']['types.Resource'];
        };
        'soc.AddBoardOutput': {
            item?: components['schemas']['types.Board'];
        };
        'soc.AddCoreOutput': {
            item?: components['schemas']['types.CorePart'];
        };
        'soc.AddPackageOutput': {
            item?: components['schemas']['types.Package'];
        };
        'soc.CreateInputBoard': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            description: string;
            /** Format: typeid */
            id?: string;
            name: string;
            packageIdxs: number[];
            productUrl?: string;
        };
        'soc.CreateInputCore': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            coreType: components['schemas']['soc.CreateInputCoreType'];
            dataModelCoreID: string;
            description?: string;
            extensions: string[];
            /** Format: typeid */
            id?: string;
            name: string;
            primary?: boolean;
            supportsAI?: boolean;
            supportsTrustZone?: boolean;
        };
        'soc.CreateInputCoreType': {
            architecture?: string;
            /** Format: typeid */
            id?: string;
            isa?: string;
        };
        'soc.CreateInputFamily': {
            /** Format: typeid */
            id?: string;
            name?: string;
        };
        'soc.CreateInputPackage': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            dataModelPackageID?: string;
            description: string;
            /** Format: typeid */
            id?: string;
            name: string;
            /** @enum {string} */
            packageType:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED'
                | 'EWLB'
                | 'LFCSP'
                | 'LGA';
        };
        'soc.CreateOutput': {
            item: components['schemas']['types.SoC'];
        };
        'soc.GetSoCOutput': {
            item: components['schemas']['types.SoC'];
        };
        'soc.UpdateBoardOutput': {
            item?: components['schemas']['types.Board'];
        };
        'soc.UpdateCoreOutput': {
            item?: components['schemas']['types.CorePart'];
        };
        'soc.UpdateCoreType': {
            architecture?: string;
            /** Format: typeid */
            id?: string;
            isa?: string;
        };
        'soc.UpdatePackageOutput': {
            item: components['schemas']['types.Package'];
        };
        'soc.UpdateSoCOutput': {
            item?: components['schemas']['types.SoC'];
        };
        'socfamily.CreateOutput': {
            item: components['schemas']['types.SoCFamily'];
        };
        'socfamily.GetSoCFamilyOutput': {
            item: components['schemas']['types.SoCFamily'];
        };
        'socfamily.UpdateSoCFamilyOutput': {
            item?: components['schemas']['types.SoCFamily'];
        };
        'swpackagetag.CreateSWPackageTagOutput': {
            item: components['schemas']['types.SWPackageTag'];
        };
        'swpackagetag.UpdateSWPackageTagOutput': {
            item: components['schemas']['types.SWPackageTag'];
        };
        'types.AccessTag': {
            read: string[];
            write: string[];
        };
        'types.APIKey': {
            createdAt: string;
            description?: string;
            expiration: string;
            id: string;
            key?: string;
            maskedKey: string;
            ownerEmail: string;
            ownerID: string;
            read: string[];
            /** @enum {string} */
            role: 'user' | 'admin';
            write: string[];
        };
        'types.Board': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            description: string;
            id: string;
            name: string;
            packageIDs: string[];
            productUrl?: string;
            socID: string;
        };
        'types.CorePart': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            coreType: components['schemas']['types.CoreType'];
            dataModelCoreID: string;
            description?: string;
            extensions: string[];
            id: string;
            name: string;
            primary: boolean;
            socID: string;
            supportsAI?: boolean;
            supportsTrustZone?: boolean;
        };
        'types.CoreType': {
            architecture: string;
            description?: string;
            id: string;
            isa: string;
        };
        'types.Documentation': {
            categories: ('home' | 'dashboard')[];
            name: string;
            url: string;
        };
        'types.Entitlement': {
            /** @description timestamps */
            createdAt: string;
            disabled?: boolean;
            /** @enum {string} */
            entitlementType: 'PACKAGE_REPO_TOKEN';
            expiresAt: string;
            externalId: string;
            id: string;
            /** Format: email */
            ownerEmail: string;
            ownerId: string;
            ownerUserIDP: components['schemas']['types.UserIDP'];
            packageTags: string[];
            refreshedAt?: string;
            repoUrl: string;
            supportedRepoUrls: string[];
            updatedAt?: string;
        };
        'types.Media': {
            /** @enum {string} */
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'types.Package': {
            accessTag?: components['schemas']['types.AccessTag'];
            cfsVersionConstraint?: string;
            dataModelPackageID: string;
            description: string;
            id: string;
            name: string;
            /** @enum {string} */
            packageType:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED'
                | 'EWLB'
                | 'LFCSP'
                | 'LGA';
            socID: string;
        };
        'types.Resource': {
            accessTag?: components['schemas']['types.AccessTag'];
            addedAt: string;
            cfsVersionConstraint?: string;
            id: string;
            /** @enum {string} */
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'types.SoC': {
            accessTag?: components['schemas']['types.AccessTag'];
            boards: components['schemas']['types.Board'][];
            cfsVersionConstraint?: string;
            cores: components['schemas']['types.CorePart'][];
            description: string;
            documentation?: components['schemas']['types.Documentation'][];
            family: components['schemas']['types.SoCFamily'];
            id: string;
            media?: components['schemas']['types.Media'][];
            name: string;
            packages: components['schemas']['types.Package'][];
            supportsMCUboot?: boolean;
        };
        'types.SoCFamily': {
            id: string;
            name: string;
        };
        'types.SWPackageRepo': {
            id: string;
            repoUrl: string;
        };
        'types.SWPackageTag': {
            accessTag?: components['schemas']['types.AccessTag'];
            description?: string;
            id: string;
            packageTag: string;
            repoUrl: string;
            supportedRepoUrls: string[];
        };
        'types.UserIDP': {
            issuer: string;
            subject: string;
        };
        'user.CreateUserOutput': {
            item: components['schemas']['mainmodule_internal_pkg_types.User'];
        };
        'user.GetUserOutput': {
            item: components['schemas']['mainmodule_internal_pkg_types.User'];
        };
        'user.UpdateUserOutput': {
            item: components['schemas']['mainmodule_internal_pkg_types.User'];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
