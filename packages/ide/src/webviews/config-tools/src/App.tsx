/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {Provider} from 'react-redux';
import Navigation from './components/navigation/Navigation';
import AppPanel from './components/app-panel/AppPanel';
import {type Store, getPreloadedStateStore} from './state/store';
import styles from './App.module.scss';
import CfgtoolsTopBar from './components/cfgtools-header/CfgtoolsTopbar';
import {LocalizationProvider} from '../../common/contexts/LocaleContext';
import ScreenLoader from './components/screen-loader/screen-loader';

function App() {
	const [store, setStore] = useState<Store | undefined>();

	useEffect(() => {
		if (store === undefined) {
			getPreloadedStateStore()
				.then(preloadedStateStore => {
					if (store === undefined) {
						setStore(preloadedStateStore);
					}
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
		return <ScreenLoader />;
	}

	return (
		<Provider store={store}>
			<LocalizationProvider namespace='cfgtools'>
				<div className={styles.appContainer}>
					<div className={styles.topBar}>
						<CfgtoolsTopBar />
					</div>
					<div className={styles.navigation}>
						<Navigation />
					</div>
					<AppPanel />
				</div>
			</LocalizationProvider>
		</Provider>
	);
}

export default App;
