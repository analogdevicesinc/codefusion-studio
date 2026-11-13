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
import {useEffect, useState} from 'react';
import {useMessenger} from '@common/contexts/MessengerContext';
import type {
	WestManifest,
	WestManifestImport
} from '@west-editor/types';
import {westEditorImportsRequest} from '@west-editor/messages';
import {getErrorMessage} from '../utils/error-message';

type ManifestImportsState = {
	/** Resolved imports, or undefined until the first response arrives. */
	imports?: WestManifestImport[];
	error?: string;
};

/**
 * Asks the extension host which manifests `manifest` imports.
 *
 * Only the host can resolve them: a directory import expands to the files
 * inside it, and every path is relative to the workspace topdir. Re-requested
 * whenever the manifest changes; a response for a superseded manifest is
 * dropped so a slow reply cannot overwrite a newer one.
 *
 * @param manifest Manifest to resolve, or undefined while none is loaded.
 * @returns The latest resolved imports, and the error of the last request.
 */
export function useManifestImports(
	manifest: WestManifest | undefined
): ManifestImportsState {
	const messenger = useMessenger();
	const [state, setState] = useState<ManifestImportsState>({});

	useEffect(() => {
		if (!manifest) return undefined;

		let current = true;

		messenger
			.sendRequest(
				westEditorImportsRequest,
				{type: 'extension'},
				manifest
			)
			.then(imports => {
				if (current) setState({imports});
			})
			.catch(e => {
				if (current) {
					setState({
						error: getErrorMessage(e)
					});
				}
			});

		return () => {
			current = false;
		};
	}, [messenger, manifest]);

	return state;
}
