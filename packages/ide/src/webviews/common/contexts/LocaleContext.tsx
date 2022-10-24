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
import {createContext, useContext} from 'react';
import type React from 'react';

export type TLocaleContext = Record<string, any>;

const LocaleContext = createContext<TLocaleContext | undefined>(
	undefined
);

export const useLocaleContext = () => useContext(LocaleContext);

type TLContext = {
	readonly namespace: string;
	readonly children: React.ReactNode;
};

export function LocalizationProvider({
	namespace,
	children
}: TLContext) {
	const translations = (window as any)
		.__webview_localization_resources__?.[namespace];

	if (translations === undefined) {
		console.warn('No translations found for the current namespace');
	}

	return (
		<LocaleContext.Provider value={translations}>
			{children}
		</LocaleContext.Provider>
	);
}
