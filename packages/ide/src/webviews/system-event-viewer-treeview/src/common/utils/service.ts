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

import {setEventCheckbox} from '../api';
import {INFO_CARD_ID, TREE_DATA_CHANGE_ID} from './constants';
import {setCard} from '../../state/slices/event-tree/event-tree.reducer';
import {refreshTreeThunk} from '../../state/slices/event-tree/event-tree.thunks';

import {type AppDispatch} from '../../state/store';
import type {EventNode, SevExtensionMessage} from './types';

export async function setNodeCheckbox(
	node: EventNode,
	value: boolean
): Promise<void> {
	await setEventCheckbox(node, value);
}

export const startEventTreeService = (dispatch: AppDispatch) => {
	const onMessageHandler = (event: MessageEvent) => {
		const data = event.data as SevExtensionMessage;

		switch (data.type) {
			case INFO_CARD_ID:
				dispatch(setCard(data.content));

				break;

			case TREE_DATA_CHANGE_ID:
				void dispatch(refreshTreeThunk({body: data.body}));

				break;

			default:
				break;
		}
	};

	window.addEventListener('message', onMessageHandler);

	return () => {
		window.removeEventListener('message', onMessageHandler);
	};
};
