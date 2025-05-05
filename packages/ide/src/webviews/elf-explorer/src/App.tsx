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
// Components
import Navigation from './components/Navigation/Navigation';
import ElfHeader from './components/ElfHeader/ElfHeader';
import AppRouter from './routes/AppRoute';

import {LocalizationProvider} from '@common/contexts/LocaleContext';
import {AppProvider} from './common/contexts/AppContext';

import styles from './App.module.scss';

function App() {
	return (
		<Provider store={store}>
			<AppProvider>
				<LocalizationProvider namespace='elf'>
					<ElfHeader />
					<div className={styles.container}>
						<Navigation />
						<AppRouter />
					</div>
				</LocalizationProvider>
			</AppProvider>
		</Provider>
	);
}

export default App;
