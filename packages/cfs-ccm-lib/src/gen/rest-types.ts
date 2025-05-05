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

export type AccessTag = {
    read?: string[];
    write?: string[];
};

export type APIKey = {
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

export type Board = {
    accessTag?: AccessTag;
    description: string;
    id: string;
    name: string;
    packageIDs: string[];
    productUrl?: string;
    socID: string;
};

export type CorePart = {
    accessTag?: AccessTag;
    coreType: CoreType;
    dataModelCoreID: string;
    description?: string;
    extensions: string[];
    id: string;
    name: string;
    primary: boolean;
    socID: string;
};

export type CoreType = {
    architecture: string;
    description?: string;
    id: string;
    isa: string;
};

export type CreateInputBoard = {
    accessTag?: AccessTag;
    description: string;
    name: string;
    packageIdxs: number[];
    productUrl?: string;
};

export type CreateInputCore = {
    accessTag?: AccessTag;
    coreType: CreateInputCoreType;
    dataModelCoreID: string;
    description?: string;
    extensions: string[];
    name: string;
    primary?: boolean;
};

export type CreateInputCoreType = {
    architecture?: string;
    description?: string;
    id?: string;
    isa?: string;
};

export type CreateInputFamily = {
    id?: string;
    name?: string;
};

export type CreateInputPackage = {
    accessTag?: AccessTag;
    description: string;
    name: string;
    packageType: 'WLP' | 'TQFN' | 'TQFP' | 'CTBGA' | 'CSBGA';
};

export type Documentation = {
    categories: ('home' | 'dashboard')[];
    name: string;
    url: string;
};

export type Media = {
    mediaType: 'article' | 'video' | 'tutorial';
    name: string;
    thumbnail?: string;
    url: string;
};

export type Package = {
    accessTag?: AccessTag;
    description: string;
    id: string;
    name: string;
    packageType: 'WLP' | 'TQFN' | 'TQFP' | 'CTBGA' | 'CSBGA';
    socID: string;
};

export type Resource = {
    accessTag?: AccessTag;
    addedAt: string;
    id: string;
    mediaType: 'article' | 'video' | 'tutorial';
    name: string;
    thumbnail?: string;
    url: string;
};

export type SoC = {
    accessTag?: AccessTag;
    boards: Board[];
    cores: CorePart[];
    description: string;
    documentation?: Documentation[];
    family: SoCFamily;
    id: string;
    media?: Media[];
    name: string;
    packages: Package[];
};

export type SoCFamily = {
    id: string;
    name: string;
};

export type SoCSummary = {
    accessTag?: AccessTag;
    description: string;
    id: string;
    name: string;
};

export type User = {
    email: string;
    id: string;
    read?: string[];
    userType: 'user' | 'admin';
    write?: string[];
};
