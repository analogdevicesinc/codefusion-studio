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
import {Provider} from 'react-redux';
import {store} from './state/store';

import AppPanel from './components/AppPanel/AppPanel';
import WrkspHeader from './components/WrkspHeader/WrkspHeader';
import WrkspFooter from './components/WrkspFooter/WrkspFooter';

import {LocalizationProvider} from '@common/contexts/LocaleContext';

import styles from './App.module.scss';

function App() {
	return (
		<Provider store={store}>
			<LocalizationProvider namespace='wrksp'>
				<div className={styles.appContainer}>
					<WrkspHeader />
					<AppPanel />
					<WrkspFooter />
				</div>
			</LocalizationProvider>
		</Provider>
	);
}

export default App;
