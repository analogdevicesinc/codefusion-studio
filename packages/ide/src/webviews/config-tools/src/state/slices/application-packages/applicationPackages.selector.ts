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
import {useAppSelector} from '../../store';

export function useApplicationPackages() {
	return useAppSelector(
		state => state.applicationPackagesReducer.applicationPackages
	);
}

export function useActivePackageId() {
	return useAppSelector(
		state => state.applicationPackagesReducer.activePackageId
	);
}

export function useActiveApplicationPackage() {
	return useAppSelector(state => {
		const {applicationPackages, activePackageId} =
			state.applicationPackagesReducer;

		return applicationPackages.find(
			pkg => pkg.id === activePackageId
		);
	});
}
