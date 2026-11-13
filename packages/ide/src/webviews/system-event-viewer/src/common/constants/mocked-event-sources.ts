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
	lastUpdate: '2026-04-08T11:00:00.000Z',
	tickFrequency: 1,
	tickEpoch: '2025-12-22T10:18:31.318653+01:00',
	eventSourceIndex: [
		'Event Source Alias 1',
		'Event Source Alias 2',
		'Event Source Alias 3'
	],
	eventSources: {
		'Event Source Alias 1': {
			events: [
				{ts: 0.6, msg: 'Event 1'},
				{ts: 1},
				{ts: 1.41},
				{ts: 1.42},
				{ts: 1.43, msg: 'Event 5'},
				{ts: 1.44, msg: 'Event 6'},
				{ts: 3.75, msg: 'Event 7'},
				{ts: 6.5, msg: 'Event 8'},
				{ts: 8.2, msg: 'Event 9'},
				{ts: 13.99, msg: 'Event 10'},
				{ts: 19.8, msg: 'Event 11'},
				{ts: 20, msg: 'Event 12'}
			]
		},
		'Event Source Alias 2': {
			events: [{ts: 0.1, msg: 'Event 1'}, {ts: 4.35}, {ts: 7.22}]
		},
		'Event Source Alias 3': {
			events: [
				{ts: 2.8, msg: 'Event 1'},
				{ts: 3.0, msg: 'Event 2'},
				{ts: 3.01, msg: 'Event 3'},
				{ts: 5.5, msg: 'Event 4'}
			]
		}
	}
};
