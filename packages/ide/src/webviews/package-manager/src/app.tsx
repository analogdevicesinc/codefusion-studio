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
import {useState} from 'react';
import {
	LocalizationProvider,
	useLocaleContext
} from '@common/contexts/LocaleContext';
import PackageManagerHeader from './components/header/PackageManagerHeader';
import '@vscode/codicons/dist/codicon.css';

import styles from './app.module.scss';
import Onboarding from './components/onboarding/Onboarding';
import MainPackageContainer from './components/main-package-container/MainPackageContainer';
import Pagination from './components/pagination/Pagination';
import ActionBar from './components/action-bar/ActionBar';
import {Provider} from 'react-redux';
import {MessengerProvider} from '../../common/contexts/MessengerContext';
import {store, useAppDispatch} from './state/store';
import {setNoSelectionError} from './state/slices/packages/packages.reducer';
import {
	useSelectedPackages,
	usePackageListLoading,
	useHasInstalledVersionSelected
} from './state/slices/packages/packages.selector';
import ReviewSummary from './components/review-summary/ReviewSummary';
import LicenseAcceptPage from './components/license-page/LicenseAcceptPage';
import LicensePreviewPage from './components/license-preview-page/LicensePreviewPage';
import InstallProgressPage from './components/install-progress/InstallProgressPage';

type CommandArgs = {
	view?: 'license-preview';
	packageName?: string;
	packageVersion?: string;
	packageLicense?: string;
};

function getCommandArgs(): CommandArgs {
	return (
		(window as unknown as {__command_args__?: CommandArgs})
			.__command_args__ ?? {}
	);
}

function AppContent() {
	const actionBarL10n = useLocaleContext()?.actionBar;
	const dispatch = useAppDispatch();
	const selectedPackages = useSelectedPackages();
	const loading = usePackageListLoading();
	const hasInstalledVersionSelected =
		useHasInstalledVersionSelected();
	const [step, setStep] = useState<
		'list' | 'review' | 'license' | 'installing'
	>('list');

	const handleContinue = () => {
		if (selectedPackages.length === 0) {
			dispatch(setNoSelectionError(true));

			return;
		}

		setStep('review');
	};

	return (
		<div className={styles.appContainer}>
			<PackageManagerHeader />
			<div className={styles.main}>
				<div
					className={step === 'list' ? styles.content : styles.hidden} // Use hidden class to keep the component mounted so that state is preserved
				>
					<Onboarding />
					<MainPackageContainer />
					{!loading && (
						<div className={styles.bottomBar}>
							<Pagination />
							<ActionBar
								primaryAction={{
									label: actionBarL10n?.continue ?? 'continue',
									disabled: hasInstalledVersionSelected,
									onClick: handleContinue
								}}
							/>
						</div>
					)}
				</div>

				{step === 'review' && (
					<ReviewSummary
						onBack={() => {
							setStep('list');
						}}
						onContinue={() => {
							setStep('license');
						}}
					/>
				)}
				{step === 'license' && (
					<LicenseAcceptPage
						onBack={() => {
							setStep('review');
						}}
						onAcceptAndInstall={() => {
							setStep('installing');
						}}
					/>
				)}
				{step === 'installing' && (
					<InstallProgressPage
						onFinish={() => {
							setStep('list');
						}}
					/>
				)}
			</div>
		</div>
	);
}

function App() {
	const args = getCommandArgs();

	return (
		<MessengerProvider>
			<Provider store={store}>
				<LocalizationProvider namespace='packman'>
					{args.view === 'license-preview' ? (
						<LicensePreviewPage
							packageName={args.packageName ?? ''}
							packageVersion={args.packageVersion ?? ''}
							licenseName={args.packageLicense ?? ''}
						/>
					) : (
						<AppContent />
					)}
				</LocalizationProvider>
			</Provider>
		</MessengerProvider>
	);
}

export default App;
