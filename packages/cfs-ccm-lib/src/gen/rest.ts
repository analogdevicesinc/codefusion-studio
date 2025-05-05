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

import { Coretypes } from './coretypes.js';
import { Resources } from './resources.js';
import { Socfamilies } from './socfamilies.js';
import { Socs } from './socs.js';
import { SocsBoards } from './socs-boards.js';
import { SocsPackages } from './socs-packages.js';
import { Users } from './users.js';
import { UsersKeys } from './users-keys.js';
import { OpenApiClient } from '../sdk/openapi-client.js';

export interface RestApi {
    coretypes: Coretypes;
    resources: Resources;
    socfamilies: Socfamilies;
    socs: Socs;
    socsBoards: SocsBoards;
    socsPackages: SocsPackages;
    users: Users;
    usersKeys: UsersKeys;
}

export class RestClient implements RestApi {
    #coretypes?: Coretypes;
    #resources?: Resources;
    #socfamilies?: Socfamilies;
    #socs?: Socs;
    #socsBoards?: SocsBoards;
    #socsPackages?: SocsPackages;
    #users?: Users;
    #usersKeys?: UsersKeys;

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @returns
     */
    get coretypes() {
        this.#coretypes ??= new Coretypes(this.apiClient);
        return this.#coretypes;
    }

    /**
     *
     * @returns
     */
    get resources() {
        this.#resources ??= new Resources(this.apiClient);
        return this.#resources;
    }

    /**
     *
     * @returns
     */
    get socfamilies() {
        this.#socfamilies ??= new Socfamilies(this.apiClient);
        return this.#socfamilies;
    }

    /**
     *
     * @returns
     */
    get socs() {
        this.#socs ??= new Socs(this.apiClient);
        return this.#socs;
    }

    /**
     *
     * @returns
     */
    get socsBoards() {
        this.#socsBoards ??= new SocsBoards(this.apiClient);
        return this.#socsBoards;
    }

    /**
     *
     * @returns
     */
    get socsPackages() {
        this.#socsPackages ??= new SocsPackages(this.apiClient);
        return this.#socsPackages;
    }

    /**
     *
     * @returns
     */
    get users() {
        this.#users ??= new Users(this.apiClient);
        return this.#users;
    }

    /**
     *
     * @returns
     */
    get usersKeys() {
        this.#usersKeys ??= new UsersKeys(this.apiClient);
        return this.#usersKeys;
    }
}
