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
import type React from 'react';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import {useMessenger} from '@common/contexts/MessengerContext';
import type {WestManifest, WestYamlProblem} from '@west-editor/types';
import {
	westEditorChangedNotification,
	westEditorRequestMessage,
	westEditorUpdateRequest
} from '@west-editor/messages';
import {useProjectStatuses} from '../hooks/useProjectStatuses';
import {
	WestEditorContext,
	type WestEditorContextValue
} from './WestEditorContext';
import {collectGroups} from '../utils/group-filter';
import {
	getErrorMessage,
	getYamlProblems
} from '../utils/error-message';

/** Delay before an edit is pushed to the document, so typing is not applied per keystroke. */
const WRITE_DEBOUNCE_MS = 300;

/**
 * Owns the manifest state and both halves of the sync with the extension host:
 * it pulls a fresh manifest whenever the document changes underneath it, and
 * pushes debounced edits back through the messenger.
 */
export function WestEditorProvider({
	children
}: React.PropsWithChildren) {
	const messenger = useMessenger();
	const [manifest, setManifest] = useState<WestManifest>();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>();
	const [problems, setProblems] = useState<WestYamlProblem[]>();

	const pendingWrite = useRef<WestManifest>();
	const writeTimer = useRef<ReturnType<typeof setTimeout>>();

	const cancelPendingWrite = useCallback(() => {
		if (writeTimer.current !== undefined) {
			clearTimeout(writeTimer.current);
			writeTimer.current = undefined;
		}

		pendingWrite.current = undefined;
	}, []);

	const fetchManifest = useCallback(() => {
		// A document change wins over an edit we have not flushed yet,
		// otherwise a stale draft would clobber what the user just typed in
		// the text editor.
		cancelPendingWrite();
		setLoading(true);
		setError(undefined);
		setProblems(undefined);

		messenger
			.sendRequest(westEditorRequestMessage, {type: 'extension'})
			.then(fetched => {
				setManifest(fetched);
			})
			.catch(e => {
				setError(getErrorMessage(e));
				setProblems(getYamlProblems(e));
				setManifest(undefined);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [messenger, cancelPendingWrite]);

	useEffect(() => {
		fetchManifest();
	}, [fetchManifest]);

	useEffect(
		() => () => {
			cancelPendingWrite();
		},
		[cancelPendingWrite]
	);

	// The extension notifies us when the document changed somewhere else,
	// typically the plain text editor opened from the title bar button.
	useEffect(() => {
		const disposable = messenger.onNotification(
			westEditorChangedNotification,
			() => {
				fetchManifest();
			}
		);

		return () => {
			disposable.dispose();
		};
	}, [messenger, fetchManifest]);

	const updateManifest = useCallback(
		(next: WestManifest) => {
			setManifest(next);
			setError(undefined);
			setProblems(undefined);
			pendingWrite.current = next;

			if (writeTimer.current !== undefined) {
				clearTimeout(writeTimer.current);
			}

			writeTimer.current = setTimeout(() => {
				const payload = pendingWrite.current;
				writeTimer.current = undefined;
				pendingWrite.current = undefined;

				if (!payload) return;

				messenger
					.sendRequest(
						westEditorUpdateRequest,
						{type: 'extension'},
						payload
					)
					.catch(e => {
						setError(getErrorMessage(e));
					});
			}, WRITE_DEBOUNCE_MS);
		},
		[messenger]
	);

	const groups = useMemo(
		() => (manifest ? collectGroups(manifest) : []),
		[manifest]
	);
	const statuses = useProjectStatuses(manifest);

	const value = useMemo<WestEditorContextValue>(
		() => ({
			manifest,
			groups,
			loading,
			error,
			problems,
			statuses,
			updateManifest
		}),
		[
			manifest,
			groups,
			loading,
			error,
			problems,
			statuses,
			updateManifest
		]
	);

	return (
		<WestEditorContext.Provider value={value}>
			{children}
		</WestEditorContext.Provider>
	);
}
