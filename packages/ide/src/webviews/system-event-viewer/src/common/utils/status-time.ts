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

const ONE_MINUTE_MS = 60 * 1000;

/**
 * Format elapsed time from a ISO timestamp
 */
export function formatElapsedTime(
	lastUpdate: string | undefined,
	now = new Date()
): string | undefined {
	if (!lastUpdate) {
		return undefined;
	}

	const parsed = new Date(lastUpdate);

	if (Number.isNaN(parsed.getTime())) {
		return undefined;
	}

	const diffMs = now.getTime() - parsed.getTime();

	if (diffMs < 0) {
		return undefined;
	}

	const elapsedMins = Math.max(1, Math.ceil(diffMs / ONE_MINUTE_MS));

	if (elapsedMins > 60) {
		const hours = Math.floor(elapsedMins / 60);
		const minutes = elapsedMins % 60;

		if (minutes === 0) {
			return `${hours} h`;
		}

		return `${hours} h ${minutes} min`;
	}

	return `${elapsedMins} min`;
}
