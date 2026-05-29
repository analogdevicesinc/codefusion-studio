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
import {validateAndGenerateWorkspace} from './state/thunks/workspace-thunks';
import {
	getLocalization,
	localizeMessage
} from '../../common/utils/localization';

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
					<ModelWorkspaceCreation />
				</Provider>
			</MessengerProvider>
		</LocalizationProvider>
	);
}

export default App;

function ModelWorkspaceCreation() {
	const i10n = useLocaleContext();
	const dispatch = useAppDispatch();

	return (
		<div className={styles.content}>
			<h1>{i10n?.title}</h1>
			<FilesSection />
			<SocSection />
			<CfsFooter>
				<div className={styles.footerContent}>
					<Button
						dataTest='create-workspace-button'
						onClick={async () => {
							await dispatch(validateAndGenerateWorkspace());
						}}
					>
						{i10n?.footer.create}
					</Button>
				</div>
			</CfsFooter>
		</div>
	);
}
