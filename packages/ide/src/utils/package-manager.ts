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

import {
  CfsApiClient,
  SessionManager,
  MyAnalogCloudsmithCredentialProvider,
} from "cfs-lib";
import type { CfsPackageRemoteCredentialProvider } from "cfs-package-manager";
import { AuthConfigParser } from "../utils/auth-config";

export async function getCredentialProvider(): Promise<
  CfsPackageRemoteCredentialProvider | undefined
> {
  const authConfig = new AuthConfigParser().getConfig();
  const sessionManager = new SessionManager(authConfig);
  const session = await sessionManager.getSession();
  if (session) {
    return new MyAnalogCloudsmithCredentialProvider(
      new CfsApiClient({
        baseUrl: authConfig.ccmUrl,
        authorizer: session?.authorizer,
      }),
    );
  }
  return undefined;
}
