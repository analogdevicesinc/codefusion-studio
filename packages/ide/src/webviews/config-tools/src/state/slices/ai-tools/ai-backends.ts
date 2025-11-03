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
import type {AiSupportingBackend} from '../../../../../common/types/ai-fusion-data-model';
import type {ControlCfg} from '../../../../../common/types/soc';
import {getAiBackends, getAiProperties} from '../../../utils/api';

export async function loadAiBackends(): Promise<
	Record<string, AiSupportingBackend>
> {
	return getAiBackends();
}

let cachedControls: Record<string, ControlCfg[]> = {};

export async function getControlsForAiBackend(
	backendName: string
): Promise<ControlCfg[]> {
	const properties = await getAiProperties(backendName);

	cachedControls = {
		...cachedControls,
		[backendName]: properties
	};

	return cachedControls[backendName];
}
