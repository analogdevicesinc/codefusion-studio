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

import type {PackageManagerRemoteCredentials} from '@constants/messages/package-manager-messages';
import type {
	Remote,
	RemoteFormValues
} from '../state/slices/remotes/remotes.types';

/**
 * Credentials to send for a submitted remote form. A missing username or
 * password is sent empty, and the extension rejects it.
 */
export function toRemoteCredentials(
	values: RemoteFormValues
): PackageManagerRemoteCredentials {
	return values.auth === 'none'
		? {auth: 'none'}
		: {
				auth: 'usernamePassword',
				username: values.username ?? '',
				password: values.password ?? ''
			};
}

/**
 * Whether submitting `values` leaves the credentials of `remote` as they are.
 * The form omits the password to keep the stored one, which only holds while
 * the username stays the same.
 */
export function keepsCredentials(
	remote: Remote,
	values: RemoteFormValues
): boolean {
	if (values.auth === 'none') {
		return remote.auth === 'none';
	}

	return (
		remote.auth === 'usernamePassword' &&
		values.password === undefined &&
		values.username === remote.username
	);
}
