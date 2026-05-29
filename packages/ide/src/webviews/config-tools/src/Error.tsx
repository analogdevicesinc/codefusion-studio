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

import {LocalizationProvider} from '@common/contexts/LocaleContext';
import type {WebviewError} from '@common/types/errors';
import UnknownError from './screens/error/unknown-error';
import MissingComponentsError from './screens/error/version-updater/missing-components/missing-components-error';
import {useInitializationError} from './hooks/use-initialization-error';
import GenericError from './screens/error/generic-error';
import type {CfsMissingComponent} from 'cfs-types';

type ErrorViewProps = {
	readonly error: WebviewError;
};

function ErrorView({error}: ErrorViewProps) {
	const {title, description, items, docLink} =
		useInitializationError(error);

	const isMissingComponentErrorType =
		error.type === 'missing-components';
	const isUnknownErrorType = error.type === 'unknown';

	return (
		<LocalizationProvider namespace='cfgtools'>
			<div style={{height: '100vh'}}>
				{isMissingComponentErrorType && (
					<MissingComponentsError
						components={
							(error.body as {components: CfsMissingComponent[]})
								.components
						}
					/>
				)}

				{isUnknownErrorType && (
					<GenericError
						title={title}
						description={description}
						items={items}
						docLink={docLink}
					/>
				)}

				{!isMissingComponentErrorType && !isUnknownErrorType && (
					<UnknownError />
				)}
			</div>
		</LocalizationProvider>
	);
}

export default ErrorView;
