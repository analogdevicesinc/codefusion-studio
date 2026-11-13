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

export function caseInsensitiveCompare(
	a?: string | null,
	b?: string | null
): boolean {
	if (a == null || b == null) {
		return a === b;
	}
	return a.toUpperCase() === b.toUpperCase();
}

/**
 * Escape a single JSON Pointer (RFC 6901) reference token by encoding `~` as
 * `~0` and `/` as `~1`, in that order.
 */
export function escapeJsonPointerToken(token: string): string {
	return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
