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

import {use} from 'cfs-react-library';
import ConflictIcon from '../../../../../common/icons/Conflict';
import usePeripheralError from '../../../hooks/use-peripheral-error';
import type {ControlCfg} from '../../../../../common/types/soc';

export default function PeripheralErrorIcon({
	projectIds,
	controlsPromises
}: Readonly<{
	projectIds: string[];
	controlsPromises: Array<Promise<Record<string, ControlCfg[]>>>;
}>) {
	const controlDict: Record<
		string,
		Record<string, ControlCfg[]>
	> = {};

	controlsPromises.forEach((promise, index) => {
		controlDict[projectIds[index]] = use(promise);
	});

	const hasPeripheralError = usePeripheralError(
		controlDict,
		projectIds
	);

	return hasPeripheralError ? (
		<ConflictIcon data-test='peripheral-allocation-error' />
	) : null;
}
