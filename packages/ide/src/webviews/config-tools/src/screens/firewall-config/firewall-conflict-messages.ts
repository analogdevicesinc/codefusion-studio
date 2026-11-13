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

import type {TLocaleContext} from '../../../../common/contexts/LocaleContext';
import {localizeMessage} from '../../../../common/utils/localization';
import type {AccessModeConflict} from './firewall-validation';

/**
 * Builds the access-mode conflict message shared by the zone banner and the
 * initiator/responder row tooltips.
 *
 * @param firewallZonesL10n - The `firewallZones` locale context.
 * @param conflict - The conflict to describe.
 * @returns The localized message.
 */
export function formatAccessModeConflictMessage(
	firewallZonesL10n: TLocaleContext | undefined,
	conflict: AccessModeConflict
): string {
	return localizeMessage(firewallZonesL10n, 'accessModeConflict', {
		initiator: conflict.initiatorName,
		responder: conflict.responderName,
		zones: conflict.conflictingZoneNames.join(', ')
	});
}

/**
 * Builds the address overlap message shared by the start address dropdown and
 * the responder row tooltips.
 *
 * @param responderConfigL10n - The `firewallZones.responder-config` locale
 *   context.
 * @param regionName - The name of the region being overlapped.
 * @returns The localized message.
 */
export function formatAddressOverlapMessage(
	responderConfigL10n: TLocaleContext | undefined,
	regionName: string
): string {
	return localizeMessage(responderConfigL10n, 'addressOverlapError', {
		regionName
	});
}
