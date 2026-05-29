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

import type {MenuAction, PanelPlacement} from '../types/events';

export const MENU_ACTION: Record<string, MenuAction> = {
	top: 'top',
	up: 'up',
	down: 'down',
	bottom: 'bottom'
};

export const PANEL_PLACEMENT: Record<string, PanelPlacement> = {
	top: 'top',
	bottom: 'bottom'
};
