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

import { Coretypes } from './coretypes.js';
import { Resources } from './resources.js';
import { Socfamilies } from './socfamilies.js';
import { Socs } from './socs.js';
import { SocsBoards } from './socs-boards.js';
import { SocsCores } from './socs-cores.js';
import { SocsPackages } from './socs-packages.js';
import { SwPackagesRepos } from './sw-packages-repos.js';
import { SwPackagesTags } from './sw-packages-tags.js';
import { Users } from './users.js';
import { UsersKeys } from './users-keys.js';
import type { OpenApiClient } from './openapi-client.js';

export interface RestApi {
    coretypes: Coretypes;
    resources: Resources;
    socfamilies: Socfamilies;
    socs: Socs;
    socsBoards: SocsBoards;
    socsCores: SocsCores;
    socsPackages: SocsPackages;
    swPackagesRepos: SwPackagesRepos;
    swPackagesTags: SwPackagesTags;
    users: Users;
    usersKeys: UsersKeys;
}

export class RestClient implements RestApi {
    #coretypes?: Coretypes;
    #resources?: Resources;
    #socfamilies?: Socfamilies;
    #socs?: Socs;
    #socsBoards?: SocsBoards;
    #socsCores?: SocsCores;
    #socsPackages?: SocsPackages;
    #swPackagesRepos?: SwPackagesRepos;
    #swPackagesTags?: SwPackagesTags;
    #users?: Users;
    #usersKeys?: UsersKeys;

    constructor(private readonly apiClient: OpenApiClient) {}

    get coretypes() {
        this.#coretypes ??= new Coretypes(this.apiClient);
        return this.#coretypes;
    }

    get resources() {
        this.#resources ??= new Resources(this.apiClient);
        return this.#resources;
    }

    get socfamilies() {
        this.#socfamilies ??= new Socfamilies(this.apiClient);
        return this.#socfamilies;
    }

    get socs() {
        this.#socs ??= new Socs(this.apiClient);
        return this.#socs;
    }

    get socsBoards() {
        this.#socsBoards ??= new SocsBoards(this.apiClient);
        return this.#socsBoards;
    }

    get socsCores() {
        this.#socsCores ??= new SocsCores(this.apiClient);
        return this.#socsCores;
    }

    get socsPackages() {
        this.#socsPackages ??= new SocsPackages(this.apiClient);
        return this.#socsPackages;
    }

    get swPackagesRepos() {
        this.#swPackagesRepos ??= new SwPackagesRepos(this.apiClient);
        return this.#swPackagesRepos;
    }

    get swPackagesTags() {
        this.#swPackagesTags ??= new SwPackagesTags(this.apiClient);
        return this.#swPackagesTags;
    }

    get users() {
        this.#users ??= new Users(this.apiClient);
        return this.#users;
    }

    get usersKeys() {
        this.#usersKeys ??= new UsersKeys(this.apiClient);
        return this.#usersKeys;
    }
}
