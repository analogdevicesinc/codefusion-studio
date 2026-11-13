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

// This module must stay free of Node.js imports: the package manager webview
// imports it directly from dist/ to validate remote URLs in the browser.

/** Why a remote URL was rejected by {@link validateRemoteUrl}. */
export type CfsRemoteUrlError =
	| "required"
	| "invalid"
	| "unsupportedProtocol";

/** The outcome of {@link validateRemoteUrl}. */
export type CfsRemoteUrlValidation =
	| { valid: true; url: string }
	| { valid: false; error: CfsRemoteUrlError };

/** Default English messages for each {@link CfsRemoteUrlError}. */
export const REMOTE_URL_ERROR_MESSAGES: Record<
	CfsRemoteUrlError,
	string
> = {
	required: "Remote URL is required.",
	invalid: "Remote URL is not a valid URL.",
	unsupportedProtocol: "Remote URLs must use http or https."
};

/**
 * Validates the URL of a package remote. Only http and https URLs are
 * accepted, as those are the only remotes conan can reach.
 * @param url - The URL as entered by the user. Surrounding whitespace is ignored.
 * @returns The normalized URL when valid, otherwise the reason it was rejected.
 */
export function validateRemoteUrl(
	url: string
): CfsRemoteUrlValidation {
	const trimmed = url.trim();

	if (!trimmed) {
		return { valid: false, error: "required" };
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		return { valid: false, error: "invalid" };
	}

	// Anything of the form "scheme:rest" parses, e.g. "localhost:9300" when
	// the scheme is forgotten, so the protocol has to be checked explicitly
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return { valid: false, error: "unsupportedProtocol" };
	}

	return { valid: true, url: parsed.href };
}
