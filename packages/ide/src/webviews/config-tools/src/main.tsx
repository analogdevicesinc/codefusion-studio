/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../../../../react-library/src/styles/index.scss';
import ErrorView, {WebviewError} from './Error';

const root = document.getElementById('root');
const errorDiv = document.getElementById('error');

if (errorDiv) {
	const rawError = errorDiv.getAttribute('data-error');
	let error: WebviewError;

	try {
		error = rawError ? JSON.parse(rawError) : [];
	} catch {
		error = {type: 'unknown', body: 'unknown error'};
	}

	ReactDOM.createRoot(errorDiv).render(
		<React.StrictMode>
			<ErrorView error={error} />
		</React.StrictMode>
	);
} else if (root) {
	ReactDOM.createRoot(root).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}
