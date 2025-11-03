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
import {LocalizationProvider} from '../../common/contexts/LocaleContext';
import DataModelError, {
	DataModel
} from './screens/error/data-model-error';
import MissingPluginsError, {
	MissingPlugins
} from './screens/error/missing-plugins-error';
import UnknownError from './screens/error/unknown-error';

export type WebviewError = {
	type: string;
	body: unknown;
};

type ErrorViewProps = {
	error: WebviewError;
};

function ErrorView({error}: ErrorViewProps) {
	const renderError = (error: WebviewError) => {
		const {type, body} = error;

		switch (type) {
			case 'missing-plugins':
				return (
					<MissingPluginsError plugins={body as MissingPlugins} />
				);

			case 'data-model':
				return <DataModelError dataModel={body as DataModel} />;

			default:
				return <UnknownError />;
		}
	};

	return (
		<LocalizationProvider namespace='cfgtools'>
			<div style={{height: '100vh'}}>{renderError(error)}</div>
		</LocalizationProvider>
	);
}

export default ErrorView;
