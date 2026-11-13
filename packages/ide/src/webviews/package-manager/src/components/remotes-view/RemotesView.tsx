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

import {useEffect, useState, type ReactNode} from 'react';
import {EmptyState, ProgressRing} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import RemotesHeader from '../remotes-header/RemotesHeader';
import {useIndexingLock} from '../../hooks/useIndexingLock';
import RemoteCard from '../remote-card/RemoteCard';
import RemoteSidebar from '../remote-sidebar/RemoteSidebar';
import RemoveRemoteModal from '../remove-remote-modal/RemoveRemoteModal';
import {useAppDispatch} from '../../state/store';
import {
	useIndexingRemotes,
	useIsAddingRemote,
	useIsRemoteBusy,
	useRemote,
	useRemotes,
	useRemotesError,
	useRemotesStatus
} from '../../state/slices/remotes/remotes.selector';
import {
	addRemote,
	fetchRemotes,
	removeRemote,
	setRemoteEnabled,
	updateRemoteAuth
} from '../../state/slices/remotes/remotes.reducer';
import type {RemoteFormValues} from '../../state/slices/remotes/remotes.types';
import {keepsCredentials} from '../../utils/remotes';
import styles from './remotes-view.module.scss';

type SidebarState =
	| {isOpen: false; mode: 'add' | 'edit'; remoteName?: string}
	| {isOpen: true; mode: 'add'}
	| {isOpen: true; mode: 'edit'; remoteName: string};

export type RemotesViewProps = {
	/** Whether the Remotes tab is showing. The remotes load the first time it is. */
	readonly isActive: boolean;
};

/**
 * Body of the "Remotes" tab: lists the configured remotes and hosts the
 * add/edit side panel and the remove confirmation dialog.
 */
export default function RemotesView({isActive}: RemotesViewProps) {
	const l10n = useLocaleContext()?.remotes;
	const dispatch = useAppDispatch();
	const remotes = useRemotes();
	const status = useRemotesStatus();
	const error = useRemotesError();
	const [sidebar, setSidebar] = useState<SidebarState>({
		isOpen: false,
		mode: 'add'
	});
	const [pendingRemoval, setPendingRemoval] = useState<string>();

	const editedRemoteName =
		sidebar.mode === 'edit' ? sidebar.remoteName : undefined;
	const editedRemote = useRemote(editedRemoteName);
	const isEditedRemoteBusy = useIsRemoteBusy(editedRemoteName);
	const isAddingRemote = useIsAddingRemote();
	const indexingRemotes = useIndexingRemotes();
	const isIndexing = indexingRemotes.length > 0;
	const indexingLock = useIndexingLock();

	// Stop editing a remote that is gone or can no longer be configured, e.g.
	// after a change made outside this view or a store reset. Done while
	// rendering so the form never shows without its remote.
	if (
		sidebar.isOpen &&
		sidebar.mode === 'edit' &&
		(!editedRemote || editedRemote.disabled)
	) {
		setSidebar({...sidebar, isOpen: false});
	}

	// Load on first show, and again once a store reset (e.g. after a sign-in
	// change) has cleared the list.
	useEffect(() => {
		if (isActive && status === 'idle') {
			void dispatch(fetchRemotes());
		}
	}, [dispatch, isActive, status]);

	// Keep the last mode/remote while closing so the panel content doesn't
	// change during the slide-out animation.
	const closeSidebar = () => {
		setSidebar(current => ({...current, isOpen: false}));
	};

	const handleToggle = (name: string) => {
		const remote = remotes.find(r => r.name === name);

		if (!remote) {
			return;
		}

		void dispatch(setRemoteEnabled({name, enabled: remote.disabled}));
	};

	const handleSubmit = async (values: RemoteFormValues) => {
		const submitted = sidebar;

		// Nothing to change, or no remote left to change.
		if (
			submitted.mode === 'edit' &&
			(!editedRemote || keepsCredentials(editedRemote, values))
		) {
			closeSidebar();

			return;
		}

		try {
			const change =
				submitted.mode === 'add'
					? dispatch(addRemote(values))
					: dispatch(updateRemoteAuth(values));

			await change.unwrap();

			// Close the panel, unless it was closed or reopened in the meantime.
			setSidebar(current =>
				current === submitted ? {...current, isOpen: false} : current
			);
		} catch {
			// The extension reports the failure. The form stays open to fix it.
		}
	};

	const handleConfirmRemoval = (name: string) => {
		if (editedRemoteName === name) {
			closeSidebar();
		}

		setPendingRemoval(undefined);
		void dispatch(removeRemote({name}));
	};

	let body: ReactNode;

	if (status === 'idle' || status === 'loading') {
		body = (
			<ProgressRing position='center' dataTest='remotes:loading' />
		);
	} else if (status === 'error') {
		body = (
			<EmptyState
				type='error'
				dataTest='remotes:error'
				title={l10n?.loadErrorTitle}
				description={error}
				linkText={l10n?.retry}
				onLinkClick={() => {
					void dispatch(fetchRemotes());
				}}
			/>
		);
	} else if (remotes.length === 0) {
		body = (
			<EmptyState
				type='info'
				title={l10n?.emptyTitle}
				description={l10n?.emptyDescription}
			/>
		);
	} else {
		body = (
			<div className={styles.list} data-test='remotes:list'>
				{remotes.map(remote => (
					<RemoteCard
						key={remote.name}
						remote={remote}
						isSelected={
							sidebar.isOpen && editedRemoteName === remote.name
						}
						onToggle={handleToggle}
						onConfigure={name => {
							setSidebar({
								isOpen: true,
								mode: 'edit',
								remoteName: name
							});
						}}
						onDelete={setPendingRemoval}
					/>
				))}
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div
				className={`${styles.scrollArea} ${sidebar.isOpen ? styles.sidebarOpen : ''}`}
			>
				<div className={styles.content}>
					<RemotesHeader
						isAddDisabled={isIndexing}
						addDisabledReason={indexingLock}
						onAddRemote={() => {
							setSidebar({isOpen: true, mode: 'add'});
						}}
					/>
					{body}
				</div>
			</div>

			<RemoteSidebar
				isOpen={sidebar.isOpen}
				mode={sidebar.mode}
				remote={editedRemote}
				remotes={remotes}
				isLocked={
					isIndexing ||
					(sidebar.mode === 'add'
						? isAddingRemote
						: isEditedRemoteBusy)
				}
				onClose={closeSidebar}
				onSubmit={values => {
					void handleSubmit(values);
				}}
			/>

			<RemoveRemoteModal
				isOpen={pendingRemoval !== undefined}
				remoteName={pendingRemoval ?? ''}
				isLocked={isIndexing}
				onCancel={() => {
					setPendingRemoval(undefined);
				}}
				onConfirm={handleConfirmRemoval}
			/>
		</div>
	);
}
