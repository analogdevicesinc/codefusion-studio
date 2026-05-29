/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {useState, useEffect} from 'react';

const EVENT_MESSAGE = 'message';
const EVENT_TYPE_THEME_CHANGED = 'theme-changed';

function useVsCodeTheme() {
	const [themeChangedAt, setThemeChangedAt] = useState<number>(0);
	useEffect(() => {
		const themeMessageHandler = (event: MessageEvent) => {
			if (event.data.type !== EVENT_TYPE_THEME_CHANGED) return;

			setThemeChangedAt(Date.now());
		};

		window.addEventListener(EVENT_MESSAGE, themeMessageHandler);

		return () => {
			window.removeEventListener(EVENT_MESSAGE, themeMessageHandler);
		};
	}, []);

	return themeChangedAt;
}

export default useVsCodeTheme;
