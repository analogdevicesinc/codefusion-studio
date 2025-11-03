/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {navigationItems} from './navigation';

export const STEPS_LABELS_DICTIONARY = {
	socSelection: 'SoC',
	boardSelection: 'BOARD & PACKAGE',
	workspaceOptions: 'WORKSPACE CREATION OPTIONS',
	coresSelection: 'CORES & CONFIGURATION',
	pathSelection: 'WORKSPACE LOCATION'
};

export const SOC = navigationItems.socSelection;
export const BOARD = navigationItems.boardSelection;
export const OPTIONS = navigationItems.workspaceOptions;
export const CORES = navigationItems.coresSelection;
export const CORE_CONFIG = navigationItems.coreConfig;
export const LOCATION = navigationItems.pathSelection;
