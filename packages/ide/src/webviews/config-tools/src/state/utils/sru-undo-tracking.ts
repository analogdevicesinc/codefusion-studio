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
import {createListenerMiddleware, isAnyOf} from '@reduxjs/toolkit';
import {
	setSruConnection,
	resetSruConnection,
	restoreSruConnection,
	setUserDescription,
	setSignalAlias,
	setSignalInversion
} from '../slices/sru/sru.reducer';

export function createSruChangeTracker() {
	const generations = new Map<string, number>();

	function bump(input: string) {
		generations.set(input, (generations.get(input) ?? 0) + 1);
	}

	function getToken(input: string): number {
		return generations.get(input) ?? 0;
	}

	function isCurrent(input: string, token: number): boolean {
		return getToken(input) === token;
	}

	return {bump, getToken, isCurrent};
}

export const sruChangeTracker = createSruChangeTracker();

/**
 * Bumps `sruChangeTracker`'s generation counter for the affected input on
 * every action that changes an SRU input's connection, description,
 * `lastRealSignal`, alias, or polarity inversion - regardless of which
 * screen dispatched it.
 */
const matchesInputAction = isAnyOf(
	setSruConnection,
	resetSruConnection,
	restoreSruConnection,
	setUserDescription,
	setSignalAlias,
	setSignalInversion
);

export function getSruUndoTrackingMiddleware() {
	const listenerMiddleware = createListenerMiddleware();

	listenerMiddleware.startListening({
		matcher: matchesInputAction,
		effect(action) {
			if (!matchesInputAction(action)) {
				return;
			}

			const input =
				typeof action.payload === 'string'
					? action.payload
					: 'input' in action.payload
						? action.payload.input
						: action.payload.signalName;

			sruChangeTracker.bump(input);
		}
	});

	return listenerMiddleware.middleware;
}
