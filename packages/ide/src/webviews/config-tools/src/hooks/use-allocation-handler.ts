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
import {useCallback} from 'react';
import {useAppDispatch} from '../state/store';
import {setProjectSelectionConfig} from '../state/slices/app-context/appContext.reducer';
import {getProjectInfoList} from '../utils/config';

type AllocationConfig = {
	signal: string;
	peripheral: string;
};

type AllocationHandler = (projectId: string) => Promise<void>;

/**
 * Custom hook that handles the allocation flow for peripherals and signals.
 * Encapsulates the common pattern of:
 * 1. Getting available projects from config
 * 2. Setting allocation config in Redux
 * 3. Showing project selection view if multiple projects exist
 * 4. Auto-allocating to first project if only one exists
 *
 * @param config - The allocation configuration object
 * @param onAllocate - Callback function to handle the actual allocation
 * @returns A callback function to trigger the allocation flow
 */
export function useAllocationHandler(
	config: AllocationConfig,
	onAllocate: AllocationHandler
) {
	const dispatch = useAppDispatch();

	return useCallback(async () => {
		const projects =
			getProjectInfoList()?.map(project => project.ProjectId) ?? [];

		if (projects.length > 1) {
			const {signal, peripheral} = config ?? {};

			dispatch(
				setProjectSelectionConfig({
					peripheral,
					signal
				})
			);

			return;
		}

		await onAllocate(projects[0]);
	}, [dispatch, config, onAllocate]);
}
