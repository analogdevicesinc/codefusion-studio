/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

// This file is used to bundle the CodeFusion Studio VS Code extension tests using Vite.
// This file serves as an entry point in the Vite config file.

import "./ui-test/build/adi-sdkpath-prompt-test";
import "./ui-test/build/build-project-test";
import "./ui-test/debug/cortex-debug-test";
import "./ui-test/general/activation-test";
import "./ui-test/general/command-test";
import "./ui-test/general/new-project-test-skip";
import "./ui-test/home/show-on-startup-test";
import "./ui-test-utils/activation-utils";
import "./ui-test-utils/file-utils";
import "./ui-test-utils/settings-utils";
import "./ui-test-utils/view-utils";
import "./ui-test/general/new-project-wizard-input-test";
