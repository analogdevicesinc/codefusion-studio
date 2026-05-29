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

import { useAppSelector, type RootState } from "../store";

export const useModelFile = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.modelFile
	);
export const useSampleData = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.sampleData
	);
export const useWorkspaceName = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.workspaceName
	);
export const useErrors = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.errors
	);

export const useSoc = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.soc
	);
export const useBoard = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.board
	);

export const useRunModelOn = () =>
	useAppSelector(
		(state: RootState) => state.workspaceConfigReducer.runModelOn
	);

export const useCompatibilityStatus = (socId: string) =>
	useAppSelector(
		(state: RootState) =>
			state.workspaceConfigReducer.compatibilityStatus[socId]
	);
