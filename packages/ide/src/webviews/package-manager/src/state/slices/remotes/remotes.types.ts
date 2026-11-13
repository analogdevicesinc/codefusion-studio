/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import type {
	PackageManagerRemote,
	PackageManagerRemoteAuth
} from '@constants/messages/package-manager-messages';

/** Authentication requirement of a remote. */
export type RemoteAuthType = PackageManagerRemoteAuth;

/** Authentication types a user can pick for a custom remote. */
export type CustomRemoteAuthType = Exclude<
	RemoteAuthType,
	'myAnalog'
>;

/** Webview representation of a package remote, as sent by the extension. */
export type Remote = Readonly<PackageManagerRemote>;

/** Values submitted by the add/edit custom remote form. */
export type RemoteFormValues = {
	readonly name: string;
	readonly url: string;
	readonly auth: CustomRemoteAuthType;
	readonly username?: string;
	readonly password?: string;
};
