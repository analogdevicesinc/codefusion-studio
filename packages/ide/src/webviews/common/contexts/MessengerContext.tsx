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

import type React from 'react';
import {createContext, useContext} from 'react';
import {Messenger} from 'vscode-messenger-webview';
import {webviewApiBridge} from '../test-utils/messenger-mock';

export const messenger = new Messenger(
	window.acquireVsCodeApi
		? window.acquireVsCodeApi()
		: webviewApiBridge
);
messenger.start();

const MessengerContext = createContext<Messenger | undefined>(
	undefined
);

export const useMessenger = () => {
	const ctx = useContext(MessengerContext);
	if (!ctx)
		throw new Error(
			'useMessenger must be used within MessengerProvider'
		);

	return ctx;
};

export function MessengerProvider({
	children
}: React.PropsWithChildren) {
	return (
		<MessengerContext.Provider value={messenger}>
			{children}
		</MessengerContext.Provider>
	);
}
