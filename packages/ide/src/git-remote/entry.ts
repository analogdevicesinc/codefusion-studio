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

import { runGitRemoteCfspkg } from "cfs-package-manager";
import path from "path";

/**
 * `git-remote-cfspkg` entry point bundled with the IDE extension.
 *
 * Locates packages already installed by the CFS package manager and serves
 * them to git/west for `cfspkg://` URLs.
 */

const conanConfigPath = path.join(__dirname, "..", "conan-config");
const cfsInstallDir = process.env.CFS_SDK_PATH;
void runGitRemoteCfspkg(conanConfigPath, cfsInstallDir);
