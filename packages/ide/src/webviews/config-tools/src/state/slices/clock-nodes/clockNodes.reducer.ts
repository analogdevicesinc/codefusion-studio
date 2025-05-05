/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {type PayloadAction, createSlice} from '@reduxjs/toolkit';
import type {ClockNodesDictionary} from '@common/types/soc';
import type {ControlErrorTypes} from '../../../types/errorTypes';

export type ClockNodeSet = {
	name: string;
	key: string;
	value: string;
	error?: ControlErrorTypes;
};

export type ClockNodesState = {
	clockNodes: ClockNodesDictionary;
	activeClockNodeType: string | undefined;
	clockNodeDetailsTargetNode: string | undefined;
	diagramData: Record<
		string,
		{enabled: boolean | undefined; error: boolean | undefined}
	>;
};

export const clockNodesInitialState: ClockNodesState = {
	clockNodes: {},
	activeClockNodeType: undefined,
	clockNodeDetailsTargetNode: undefined,
	diagramData: {}
};

const clockNodes = createSlice({
	name: 'ClockConfig',
	initialState: clockNodesInitialState,
	reducers: {
		setClockNodeDetailsTargetNode(
			state,
			{payload}: PayloadAction<string | undefined>
		) {
			state.clockNodeDetailsTargetNode = payload;
		},
		setActiveClockNodeType(state, {payload}: PayloadAction<string>) {
			if (state.activeClockNodeType === payload) {
				state.activeClockNodeType = undefined;
			} else {
				state.activeClockNodeType = payload;
			}
		},
		setClockNodeControlValue(
			state,
			{
				payload
			}: PayloadAction<ClockNodeSet & {discardPersistence?: boolean}>
		) {
			if (payload.name) {
				const targetClockNode = state.clockNodes[payload.name];

				if (
					targetClockNode.controlValues?.[payload.key] !== undefined
				) {
					targetClockNode.controlValues[payload.key] = payload.value;
				}

				if (targetClockNode.Errors && payload.error === undefined) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete targetClockNode.Errors[payload.key];
				} else if (
					targetClockNode.Errors === undefined &&
					payload.error
				) {
					targetClockNode.Errors = {[payload.key]: payload.error};
				} else if (
					targetClockNode.Errors &&
					targetClockNode.Errors[payload.key] !== payload.error
				) {
					targetClockNode.Errors[payload.key] = payload.error;
				}
			}
		},
		setDiagramData(
			state,
			{
				payload
			}: PayloadAction<
				Record<
					string,
					{enabled: boolean | undefined; error: boolean | undefined}
				>
			>
		) {
			state.diagramData = payload;
		}
	}
});

export const {
	setClockNodeDetailsTargetNode,
	setActiveClockNodeType,
	setClockNodeControlValue,
	setDiagramData
} = clockNodes.actions;

export const clockNodesReducer = clockNodes.reducer;
