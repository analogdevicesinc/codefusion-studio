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

import type {CfsEventsDocument} from '../types/events';

export const TIMESTAMPS: CfsEventsDocument = {
	schemaVersion: '0.2',
	lastUpdate: '2026-04-08T11:00:00.000Z',
	tickFrequency: 1,
	ticksEpoch: '2025-12-22T10:18:31.318653+01:00',
	events: {
		'Event Source Alias 1': {
			timestamps: [
				0.6, 1, 1.41, 1.42, 1.43, 1.44, 3.75, 6.5, 8.2, 13.99, 19.8,
				20
			]
		},
		'Event Source Alias 2': {
			timestamps: [0.1, 4.35, 7.22]
		},
		'Event Source Alias 3': {
			timestamps: [2.8, 3.0, 3.01, 5.5]
		}
	}
};
