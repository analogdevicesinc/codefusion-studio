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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type ApplicationPackage} from '../../../types/application-packages';

type ApplicationPackagesState = {
	applicationPackages: ApplicationPackage[];
	activePackageId: string | undefined;
};

export const applicationPackagesInitialState: ApplicationPackagesState =
	{
		applicationPackages: [],
		activePackageId: undefined
	};

const applicationPackagesSlice = createSlice({
	name: 'ApplicationPackages',
	initialState: applicationPackagesInitialState,
	reducers: {
		addApplicationPackage(
			state,
			{payload}: PayloadAction<ApplicationPackage>
		) {
			state.applicationPackages = [
				...state.applicationPackages,
				payload
			];
			state.activePackageId = payload.id;
		},
		removeApplicationPackage(
			state,
			{payload}: PayloadAction<{id: string}>
		) {
			state.applicationPackages = state.applicationPackages.filter(
				pkg => pkg.id !== payload.id
			);

			if (state.activePackageId === payload.id) {
				state.activePackageId = state.applicationPackages[0]?.id;
			}
		},
		setActivePackageId(
			state,
			{payload}: PayloadAction<string | undefined>
		) {
			state.activePackageId = payload;
		},
		updateApplicationPackage(
			state,
			{
				payload
			}: PayloadAction<{
				id: string;
				updates: Partial<
					Omit<ApplicationPackage, 'id'>
				>;
			}>
		) {
			const pkg = state.applicationPackages.find(
				p => p.id === payload.id
			);

			if (pkg) {
				Object.assign(pkg, payload.updates);
			}
		},
		clearSignKeyReferences(
			state,
			{payload}: PayloadAction<string>
		) {
			for (const pkg of state.applicationPackages) {
				if (pkg.signKey === payload) {
					pkg.signKey = undefined;
				}

				if (pkg.images) {
					for (const img of pkg.images) {
						if (img.signKey === payload) {
							img.signKey = undefined;
						}
					}
				}
			}
		}
	}
});

export const {
	addApplicationPackage,
	removeApplicationPackage,
	setActivePackageId,
	updateApplicationPackage,
	clearSignKeyReferences
} = applicationPackagesSlice.actions;

export const applicationPackagesReducer =
	applicationPackagesSlice.reducer;
