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
                        'application/json': components['schemas']['coretype.ListCoreTypeOutput'];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
                        'application/json': components['schemas']['resource.ListResourcesOutput'];
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
                query?: never;
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
                        'application/json': components['schemas']['socfamily.ListSoCFamiliesOutput'];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
                    /** @description The version of CFS to filter results for */
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
                        'application/json': components['schemas']['soc.ListSoCsOutput'];
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
         * @description Returns an SoC object with all its underlaying components by its ID
         */
        get: {
            parameters: {
                query?: {
                    /** @description The version of CFS to filter results for */
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
        delete?: never;
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
                path?: never;
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
                path?: never;
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
                path?: never;
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
                        'application/json': components['schemas']['user.ListUsersOutput'];
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
        get?: never;
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
                        'application/json': components['schemas']['user.ListAPIKeysOutput'];
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
        'coretype.ListCoreTypeOutput': {
            continuationToken?: string;
            items: components['schemas']['types.CoreType'][];
        };
        'main.AddBoardRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            description: string;
            name: string;
            packageIDs: string[];
            productUrl?: string;
        };
        'main.AddPackageRequest': {
            description: string;
            name: string;
            packageType:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED';
        };
        'main.CreateAPIKeyRequest': {
            description?: string;
            readTags: string[];
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
            /** @description x86_64, armv7, mips32 */
            isa: string;
        };
        'main.CreateResourceRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'main.CreateSoCFamilyRequest': {
            name: string;
        };
        'main.CreateSoCRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            boards?: components['schemas']['soc.CreateInputBoard'][];
            cores: components['schemas']['soc.CreateInputCore'][];
            description: string;
            documentation?: components['schemas']['types.Documentation'][];
            family: components['schemas']['soc.CreateInputFamily'];
            media?: components['schemas']['types.Media'][];
            name: string;
            packages?: components['schemas']['soc.CreateInputPackage'][];
        };
        'main.CreateUserRequest': {
            /** Format: email */
            email: string;
            readTags?: string[];
            userType: 'user' | 'admin';
            writeTags?: string[];
        };
        'main.EntitlementRequest': {
            entitlementType: 'PACKAGE_REPO_TOKEN';
            repoUrl: string;
            /** @description Pass existing token to refresh the entitlement */
            token?: string;
        };
        'main.EntitlementResponse': {
            entitlementType: 'PACKAGE_REPO_TOKEN';
            repoUrl: string;
            token: string;
        };
        'main.PatchSoCRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            description?: string;
            documentation?: components['schemas']['types.Documentation'][];
            media?: components['schemas']['types.Media'][];
            name?: string;
        };
        'main.UpdateResourceRequest': {
            accessTag?: components['schemas']['types.AccessTag'];
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'main.UpdateUserRequest': {
            readTags: string[];
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
            userType: 'user' | 'admin';
        };
        'resource.CreateResourceOutput': {
            item: components['schemas']['types.Resource'];
        };
        'resource.GetResourceOutput': {
            item: components['schemas']['types.Resource'];
        };
        'resource.ListResourcesOutput': {
            continuationToken?: string;
            items: components['schemas']['types.Resource'][];
        };
        'resource.UpdateResourceOutput': {
            item: components['schemas']['types.Resource'];
        };
        'soc.AddBoardOutput': {
            item?: components['schemas']['types.Board'];
        };
        'soc.AddPackageOutput': {
            item?: components['schemas']['types.Package'];
        };
        'soc.CreateInputBoard': {
            accessTag?: components['schemas']['types.AccessTag'];
            description: string;
            name: string;
            packageIdxs: number[];
            productUrl?: string;
        };
        'soc.CreateInputCore': {
            accessTag?: components['schemas']['types.AccessTag'];
            coreType: components['schemas']['soc.CreateInputCoreType'];
            dataModelCoreID: string;
            description?: string;
            extensions: string[];
            name: string;
            primary?: boolean;
            supportsTrustZone?: boolean;
        };
        'soc.CreateInputCoreType': {
            architecture?: string;
            description?: string;
            id?: string;
            isa?: string;
        };
        'soc.CreateInputFamily': {
            id?: string;
            name?: string;
        };
        'soc.CreateInputPackage': {
            accessTag?: components['schemas']['types.AccessTag'];
            description: string;
            name: string;
            packageType:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED';
        };
        'soc.CreateOutput': {
            item: components['schemas']['types.SoC'];
        };
        'soc.GetSoCOutput': {
            item: components['schemas']['types.SoC'];
        };
        'soc.ListSoCsOutput': {
            continuationToken?: string;
            items: components['schemas']['types.SoCSummary'][];
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
        'socfamily.ListSoCFamiliesOutput': {
            continuationToken?: string;
            items: components['schemas']['types.SoCFamily'][];
        };
        'types.AccessTag': {
            read?: string[];
            write?: string[];
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
            read?: string[];
            role: 'user' | 'admin';
            write?: string[];
        };
        'types.Board': {
            accessTag?: components['schemas']['types.AccessTag'];
            description: string;
            id: string;
            name: string;
            packageIDs: string[];
            productUrl?: string;
            socID: string;
        };
        'types.CorePart': {
            accessTag?: components['schemas']['types.AccessTag'];
            coreType: components['schemas']['types.CoreType'];
            dataModelCoreID: string;
            description?: string;
            extensions: string[];
            id: string;
            name: string;
            primary: boolean;
            socID: string;
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
        'types.Media': {
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'types.Package': {
            accessTag?: components['schemas']['types.AccessTag'];
            description: string;
            id: string;
            name: string;
            packageType:
                | 'WLP'
                | 'TQFN'
                | 'TQFP'
                | 'CTBGA'
                | 'CSBGA'
                | 'BGAED';
            socID: string;
        };
        'types.Resource': {
            accessTag?: components['schemas']['types.AccessTag'];
            addedAt: string;
            id: string;
            mediaType: 'article' | 'video' | 'tutorial';
            name: string;
            thumbnail?: string;
            url: string;
        };
        'types.SoC': {
            accessTag?: components['schemas']['types.AccessTag'];
            boards: components['schemas']['types.Board'][];
            cores: components['schemas']['types.CorePart'][];
            description: string;
            documentation?: components['schemas']['types.Documentation'][];
            family: components['schemas']['types.SoCFamily'];
            id: string;
            media?: components['schemas']['types.Media'][];
            name: string;
            packages: components['schemas']['types.Package'][];
        };
        'types.SoCFamily': {
            id: string;
            name: string;
        };
        'types.SoCSummary': {
            accessTag?: components['schemas']['types.AccessTag'];
            description: string;
            id: string;
            name: string;
        };
        'user.CreateUserOutput': {
            item: components['schemas']['mainmodule_internal_pkg_types.User'];
        };
        'user.GetUserOutput': {
            item: components['schemas']['mainmodule_internal_pkg_types.User'];
        };
        'user.ListAPIKeysOutput': {
            items: components['schemas']['types.APIKey'][];
        };
        'user.ListUsersOutput': {
            items: components['schemas']['mainmodule_internal_pkg_types.User'][];
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
