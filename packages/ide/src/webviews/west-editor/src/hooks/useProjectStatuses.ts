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
	WestProjectStatus
} from '@west-editor/types';
import {
	westEditorProjectStatusRequest,
	westEditorStatusChangedNotification
} from '@west-editor/messages';

/**
 * Asks the extension host how each project on disk compares with the
 * workspace. Requested once the manifest loads and again whenever the host
 * says statuses may have changed; edits alone never re-run west.
 *
 * @param manifest The loaded manifest, or undefined while none is loaded.
 * @returns Statuses by project name, a project without one absent;
 * undefined until the first reply. Later refreshes keep the previous ones.
 */
export function useProjectStatuses(
	manifest: WestManifest | undefined
): Record<string, WestProjectStatus> | undefined {
	const messenger = useMessenger();
	const [statuses, setStatuses] = useState<
		Record<string, WestProjectStatus> | undefined
	>();
	const [generation, setGeneration] = useState(0);

	const loaded = manifest !== undefined;

	useEffect(() => {
		const disposable = messenger.onNotification(
			westEditorStatusChangedNotification,
			() => {
				setGeneration(current => current + 1);
			}
		);

		return () => {
			disposable.dispose();
		};
	}, [messenger]);

	useEffect(() => {
		if (!loaded) return undefined;

		let current = true;

		// The host reads the document itself, so no manifest is sent.
		messenger
			.sendRequest(westEditorProjectStatusRequest, {
				type: 'extension'
			})
			.then(result => {
				if (current) setStatuses(result.statuses);
			})
			.catch(() => {
				// The host logs failures; just stop loading, keeping any earlier statuses.
				if (current) setStatuses(previous => previous ?? {});
			});

		return () => {
			current = false;
		};
	}, [messenger, loaded, generation]);

	return statuses;
}
