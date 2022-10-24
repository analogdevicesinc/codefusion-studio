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
import {type CanvasClockCoordinates} from '@common/types/soc';

export type HoveredCanvasInfo = {
	readonly id: string;
	readonly type: string;
};

export type HoveredNodeInfo = HoveredCanvasInfo & {
	readonly name: string;
	readonly description: string;
};

export type HoveredClockInfo = HoveredCanvasInfo & {
	readonly startPoint: CanvasClockCoordinates;
	readonly endPoint: CanvasClockCoordinates;
	readonly clock: string;
};
