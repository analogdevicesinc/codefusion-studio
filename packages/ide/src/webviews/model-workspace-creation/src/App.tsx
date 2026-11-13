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

import {Button} from 'cfs-react-library';
import CfsFooter from '../../common/components/cfs-footer/CfsFooter';
import styles from './App.module.scss';
import {FilesSection} from './sections/FilesSection';
import {
	LocalizationProvider,
	useLocaleContext
} from '../../common/contexts/LocaleContext';
import {SocSection} from './sections/SocSection';
import {MessengerProvider} from '../../common/contexts/MessengerContext';
import {Provider} from 'react-redux';
import {useEffect, useState} from 'react';
import {
	getPreloadedStateStore,
	useAppDispatch,
	type Store
} from './state/store';
import {useIsCreatingWorkspace} from './state/slices/workspace.selector';
import {
	validateAndGenerateWorkspace,
	type CompatibilityWarning
} from './state/thunks/workspace-thunks';
import {ConfirmDialog} from '../../common/components/confirm-dialog/ConfirmDialog';
import {
	getLocalization,
	localizeMessage
} from '../../common/utils/localization';
import {
	CatalogProvider,
	useCatalogContext
} from './contexts/CatalogContext';

function App() {
	const [store, setStore] = useState<Store>();

	useEffect(() => {
		if (store === undefined) {
			getPreloadedStateStore()
				.then(preloadedStateStore => {
					setStore(preloadedStateStore);
				})
				.catch(error => {
					console.error(error);

					throw new Error(
						'There was an error loading your configuration data.'
					);
				});
		}
	}, [store]);

	if (store === undefined) {
		return (
			<div className={styles.loading}>
				{localizeMessage(
					getLocalization('model-wrksp'),
					'loadingMessage'
				)}
			</div>
		);
	}

	return (
		<LocalizationProvider namespace='model-wrksp'>
			<MessengerProvider>
				<Provider store={store}>
					<CatalogProvider>
						<ModelWorkspaceCreation />
					</CatalogProvider>
				</Provider>
			</MessengerProvider>
		</LocalizationProvider>
	);
}

export default App;

function ModelWorkspaceCreation() {
	const i10n = useLocaleContext();
	const dispatch = useAppDispatch();
	const {catalog} = useCatalogContext();
	const isCreatingWorkspace = useIsCreatingWorkspace();

	const [compatibilityWarning, setCompatibilityWarning] =
		useState<CompatibilityWarning>();

	const createWorkspace = async (
		ignoreCompatibilityWarning = false
	) => {
		if (isCreatingWorkspace) return;

		const result = await dispatch(
			validateAndGenerateWorkspace({
				catalog,
				ignoreCompatibilityWarning
			})
		);

		if (
			validateAndGenerateWorkspace.fulfilled.match(result) &&
			!result.payload.success
		) {
			setCompatibilityWarning(result.payload.compatibilityWarning);
		}
	};

	return (
		<div className={styles.content}>
			<h1>{i10n?.title}</h1>
			<FilesSection />
			<SocSection />
			<CfsFooter>
				<div className={styles.footerContent}>
					<Button
						dataTest='create-workspace-button'
						onClick={async () => createWorkspace()}
					>
						{isCreatingWorkspace
							? i10n?.footer.creating
							: i10n?.footer.create}
					</Button>
				</div>
			</CfsFooter>
			<ConfirmDialog
				isOpen={compatibilityWarning !== undefined}
				title={i10n?.compatibilityWarning.title}
				message={
					compatibilityWarning
						? i10n?.compatibilityWarning[compatibilityWarning]
						: ''
				}
				confirmButtonText={i10n?.compatibilityWarning.confirm}
				cancelButtonText={i10n?.compatibilityWarning.cancel}
				onConfirm={() => {
					setCompatibilityWarning(undefined);
					void createWorkspace(true);
				}}
				onCancel={() => {
					setCompatibilityWarning(undefined);
				}}
			/>
		</div>
	);
}
