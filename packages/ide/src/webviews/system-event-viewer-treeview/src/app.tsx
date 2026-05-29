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

import {Provider} from 'react-redux';
import {store} from './state/store';
import {LocalizationProvider} from '@common/contexts/LocaleContext';

import AppContent from './components/app-content/app-content';

function App() {
	return (
		<Provider store={store}>
			<LocalizationProvider namespace='sev-treeview'>
				<AppContent />
			</LocalizationProvider>
		</Provider>
	);
}

export default App;
