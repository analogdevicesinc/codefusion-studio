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

export const SKIPPED_PACKAGE_REASON_MESSAGES = {
	UNSUPPORTED_BINARY_FOR_PLATFORM:
		"No compatible binary is available for the current platform."
} as const;

export const getSkippedPackageReasonMessage = (
	reasonCode: string
): string => {
	if (
		Object.prototype.hasOwnProperty.call(
			SKIPPED_PACKAGE_REASON_MESSAGES,
			reasonCode
		)
	) {
		return SKIPPED_PACKAGE_REASON_MESSAGES[
			reasonCode as keyof typeof SKIPPED_PACKAGE_REASON_MESSAGES
		];
	}

	return reasonCode;
};
