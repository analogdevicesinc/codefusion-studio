/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import { describe, it } from "mocha";
import { expect, assert } from "chai";
import { spy, stub } from "sinon";
import { CfsApiClient } from "cfs-ccm-lib";
import { MyAnalogCloudsmithCredentialProvider } from "../../src/auth/cloudsmith-credentials.js";

describe("MyAnalogCloudsmithCredentialProvider", () => {
	describe("getRemoteCredential", () => {
		let credsProvider: MyAnalogCloudsmithCredentialProvider;

		beforeEach(() => {
			const fetchStub = {
				POST: () =>
					Promise.resolve({
						response: {
							status: 200
						},
						data: {
							token: "secure-token"
						}
					})
			};
			const apiClient = {
				fetch: fetchStub
			} as unknown as CfsApiClient;
			credsProvider = new MyAnalogCloudsmithCredentialProvider(
				apiClient
			);
		});

		it("should return object with user and password", async () => {
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io/owner/repo"
			);
			expect(result?.password).to.equal("secure-token");
			expect(result?.user).to.equal("owner/repo");
		});

		it("should extract the username successfully when URL path has a trailing slash", async () => {
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io/owner/repo/"
			);
			expect(result?.password).to.equal("secure-token");
			expect(result?.user).to.equal("owner/repo");
		});

		it("should extract the username successfully when URL has additional path segments", async () => {
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io:443/owner/repo/extra/path/segments"
			);
			expect(result?.password).to.equal("secure-token");
			expect(result?.user).to.equal("owner/repo");
		});

		it("should extract the username successfully when URL has a port number and query params", async () => {
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io:443/owner/repo?query=param&another=param2"
			);
			expect(result?.password).to.equal("secure-token");
			expect(result?.user).to.equal("owner/repo");
		});

		it("should return undefined for non-cloudsmith URLs", async () => {
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.notcloudsmith.io/owner/repo"
			);
			expect(result).to.be.undefined;
		});

		it("should return undefined for URLs with too few path segments", async () => {
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io/owner/"
			);
			expect(result).to.be.undefined;
		});

		it("should return undefined for invalid URLs", async () => {
			const result = await credsProvider.getRemoteCredential(
				"invalid-url.cloudsmith.io/owner/repo"
			);
			expect(result).to.be.undefined;
		});
	});

	describe("refreshRemoteCredentials", () => {
		it("should not to anything if there is nothing in the cache", async () => {
			const fetchStub = {
				POST: () => Promise.resolve("")
			};
			const postSpy = spy(fetchStub, "POST");
			const apiClient = {
				fetch: fetchStub
			} as unknown as CfsApiClient;
			const credsProvider = new MyAnalogCloudsmithCredentialProvider(
				apiClient
			);

			await credsProvider.refreshRemoteCredential(
				"https://some-url.cloudsmith.io/owner/repo"
			);
			assert(postSpy.notCalled);
		});

		it("should refresh the token if repo exists in cache", async () => {
			const fetchStub = {
				POST: stub()
			};

			fetchStub.POST.onCall(0).resolves({
				response: {
					status: 200
				},
				data: {
					token: "secure-token"
				}
			});
			fetchStub.POST.onCall(1).resolves({
				response: {
					status: 200
				},
				data: {
					token: "secure-token-2"
				}
			});
			const apiClient = {
				fetch: fetchStub
			} as unknown as CfsApiClient;
			const credsProvider = new MyAnalogCloudsmithCredentialProvider(
				apiClient
			);
			const result = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io/owner/repo"
			);
			expect(result?.password).to.equal("secure-token");
			await credsProvider.refreshRemoteCredential(
				"https://some-url.cloudsmith.io/owner/repo"
			);

			const result2 = await credsProvider.getRemoteCredential(
				"https://some-url.cloudsmith.io/owner/repo"
			);
			expect(result2?.password).to.equal("secure-token-2");
		});
	});
});
