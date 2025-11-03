/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {useMemo} from 'react';
import {CatalogCoreInfo} from '../common/types/catalog';
import {getCoreList} from '../utils/core-list';
import {useSelectedSoc} from '../state/slices/workspace-config/workspace-config.selector';

/**
 *
 * @returns true if the selected SoC has more than one project available and the core is primary
 */
export default function useIsPrimaryMultipleProjects(
	isPrimary: boolean
): boolean {
	const selectedSoc = useSelectedSoc();

	const projectsList: CatalogCoreInfo[] = useMemo(
		() => Object.values(getCoreList(selectedSoc)),
		[selectedSoc]
	);
	const result = useMemo(
		() => Boolean(projectsList.length > 1 && isPrimary),
		[projectsList.length, isPrimary]
	);

	return result;
}
