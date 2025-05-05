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

import {LocalizationProvider} from '../../common/contexts/LocaleContext';
import styles from './App.module.scss';
import {CarouselPanel} from './components/carousel-panel/CarouselPanel';
import {DocumentationPanel} from './components/documentation-panel/DocumentationPanel';
import HomepageHeader from './components/homepage-header/HomepageTopbar';
import {TitlePanel} from './components/title-panel/TitlePanel';
import {TopPanel} from './components/top-panel/TopPanel';

function App() {
	return (
		<LocalizationProvider namespace='homepage'>
			<div className={styles.appContainer}>
				<HomepageHeader />
				<div className={styles.content}>
					<TitlePanel />
					<TopPanel />
					<CarouselPanel />
					<DocumentationPanel />
				</div>
			</div>
		</LocalizationProvider>
	);
}

export default App;
