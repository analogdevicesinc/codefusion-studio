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
import {useState, type ReactNode} from 'react';
import NavigationBar, {
	type NavigationTab
} from './components/NavigationBar';
import {MessengerProvider} from '../../common/contexts/MessengerContext';
import {
	LocalizationProvider,
	useLocaleContext
} from '../../common/contexts/LocaleContext';
import {WestEditorProvider} from './contexts/WestEditorProvider';
import {useWestEditor} from './contexts/WestEditorContext';
import RemotesSection from './components/RemotesSection';
import ProjectsSection from './components/ProjectsSection';
import ManifestsSection from './components/ManifestsSection';
import GroupsSection from './components/GroupsSection';
import SyncError from './components/SyncError';
import {Modal} from '../../common/components/modal/Modal';
import {LocalizedMessage} from '../../common/components/l10n/LocalizedMessage';
import styles from './App.module.scss';
import '@vscode/codicons/dist/codicon.css';

function App() {
	return (
		<MessengerProvider>
			<WestEditorProvider>
				<LocalizationProvider namespace='west-editor'>
					<WestEditor />
				</LocalizationProvider>
			</WestEditorProvider>
		</MessengerProvider>
	);
}

// Single source of truth for the tab keys: the union type below is derived
// from it, so the compiler keeps the content map synchronized when a tab is
// added or renamed. Matching localization entries must be updated manually.
const TAB_KEYS = [
	'projects',
	'remotes',
	'manifests',
	'groups'
] as const;
type WestEditorTab = (typeof TAB_KEYS)[number];

const NAVIGATION_BAR_DATA_TEST = 'west-editor:navigation-bar';
const TAB_PANEL_ID = 'west-editor:tab-panel';

export function WestEditor() {
	const l10n = useLocaleContext();
	const {loading, manifest} = useWestEditor();
	const [activeTab, setActiveTab] =
		useState<WestEditorTab>('projects');
	const [isHelpModalOpen, setIsHelpModalOpen] =
		useState<boolean>(false);

	if (loading && !manifest) {
		return <div className={styles.status}>{l10n?.loading}</div>;
	}

	const tabs: Array<NavigationTab<WestEditorTab>> = TAB_KEYS.map(
		key => ({
			key,
			label: l10n?.tabs?.[key]
		})
	);

	// Record (rather than a chain of `activeTab === '...'` checks) so the
	// compiler requires an entry for every key in TAB_KEYS - no tab can
	// silently render an empty panel.
	const tabContent: Record<WestEditorTab, ReactNode> = {
		projects: <ProjectsSection />,
		remotes: <RemotesSection />,
		manifests: <ManifestsSection />,
		groups: <GroupsSection />
	};

	// An unreadable manifest leaves nothing to show in the tabs, so only the
	// error is shown
	if (!manifest) {
		return (
			<div className={styles.appContainer}>
				<SyncError />
			</div>
		);
	}

	return (
		<div className={styles.appContainer}>
			<NavigationBar
				tabs={tabs}
				activeTab={activeTab}
				onSelectTab={key => {
					setActiveTab(key);
				}}
				tabsAriaLabel={l10n?.tabsLabel}
				helpAriaLabel={l10n?.helpLabel}
				onHelpClick={() => {
					setIsHelpModalOpen(true);
				}}
				dataTest={NAVIGATION_BAR_DATA_TEST}
				tabPanelId={TAB_PANEL_ID}
			/>
			<SyncError />
			<div
				className={styles.body}
				id={TAB_PANEL_ID}
				role='tabpanel'
				// The sections usually hold focusable fields, so the panel itself is no tab stop
				tabIndex={-1}
				aria-label={l10n?.tabs?.[activeTab]}
			>
				{tabContent[activeTab]}
			</div>
			<Modal
				isOpen={isHelpModalOpen}
				handleModalClose={() => {
					setIsHelpModalOpen(false);
				}}
				titleId='west-editor-help-modal-title'
				title={l10n?.helpModalTitle}
				closeLabel={l10n?.helpModalClose}
			>
				<LocalizedMessage parseHtml id='helpModalBody' />
			</Modal>
		</div>
	);
}

export default App;
