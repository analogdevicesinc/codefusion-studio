/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import { Authorizer } from './authorizer.js';

// A session is the means to obtain access to the API
// sessions are long-lived and can be revoked
export interface AuthSession {
    readonly authorizer: Authorizer;
    readonly userId: string;
    readonly userEmail: string;
    readonly scopes: string[];
    endSession(): Promise<void>;
}

export interface SessionInfo {
    userId: string;
    userEmail: string;
    scopes: string[];
}

// Store sessions between invocations
export interface SessionStorage<T extends SessionInfo> {
    get(): Promise<T[]>;
    set(tokenInfo: T[]): Promise<void>;
}

// Flows (eg. authorization code, client credentials, etc.)
// are used to create/revoke/refresh sessions
// Implementations should handle user interaction
export interface AuthFlows<T extends SessionInfo, P> {
    create(session?: Partial<SessionInfo>): Promise<[T, P]>;
    revoke(session: T): Promise<void>;
    refresh(session: T): Promise<P>;
}
