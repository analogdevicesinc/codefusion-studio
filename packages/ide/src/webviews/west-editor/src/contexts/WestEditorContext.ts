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
import {createContext, useContext} from 'react';
import type {
	WestManifest,
	WestProjectStatus,
	WestYamlProblem
} from '@west-editor/types';

export type WestEditorContextValue = {
	/** Current manifest, or undefined while loading or on error. */
	manifest?: WestManifest;
	/**
	 * Every group the manifest mentions, sorted and unique. Derived from
	 * `manifest`, so it is empty while there is none.
	 */
	groups: string[];
	loading: boolean;
	error?: string;
	/** Set with `error` when the document is not valid YAML; one per error. */
	problems?: WestYamlProblem[];
	/** Status of each project by name, a project without one absent; undefined while the first are loading. */
	statuses?: Record<string, WestProjectStatus>;
	/** Replaces the manifest and schedules a write-back to the document. */
	updateManifest: (next: WestManifest) => void;
};

export const WestEditorContext = createContext<
	WestEditorContextValue | undefined
>(undefined);

/**
 * Reads the west editor context.
 *
 * @throws If used outside a `WestEditorProvider`.
 */
export function useWestEditor() {
	const ctx = useContext(WestEditorContext);

	if (!ctx) {
		throw new Error(
			'useWestEditor must be used within a WestEditorProvider'
		);
	}

	return ctx;
}
