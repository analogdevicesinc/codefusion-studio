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

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

const RELATIVE_TIME = new Intl.RelativeTimeFormat(undefined, {
	numeric: 'always'
});

const LOCALE_DATE = new Intl.DateTimeFormat(undefined, {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const LOCALE_TIME = new Intl.DateTimeFormat(undefined, {
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit'
});

/**
 * Format elapsed time from an ISO timestamp
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

	if (diffMs < MINUTE_MS) {
		const seconds = Math.max(1, Math.floor(diffMs / SECOND_MS));

		return RELATIVE_TIME.format(-seconds, 'second');
	}

	if (diffMs < HOUR_MS) {
		const minutes = Math.max(1, Math.floor(diffMs / MINUTE_MS));

		return RELATIVE_TIME.format(-minutes, 'minute');
	}

	const hours = Math.floor(diffMs / HOUR_MS);

	return RELATIVE_TIME.format(-hours, 'hour');
}

/**
 * Format an ISO timestamp using browser/device locale.
 * Date ordering adapts automatically
 */
export function formatAbsoluteDate(
	isoString?: string
): string | undefined {
	if (!isoString) return undefined;

	const parsed = new Date(isoString);

	if (Number.isNaN(parsed.getTime())) return undefined;

	return (
		LOCALE_DATE.format(parsed) + ' at ' + LOCALE_TIME.format(parsed)
	);
}
