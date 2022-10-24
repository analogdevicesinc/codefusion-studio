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
import {getPath, getSourceCode} from '../common/api';

export const goToSourceCode = async (
	path: string,
	position: number[]
) => {
	try {
		await getSourceCode(path, position);
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: 'An unknown error occurred'
		);
	}
};

export const checkPath = async (path: string) => {
	try {
		let isPath = false;

		await getPath(path)
			.then(resp => {
				isPath = resp;
			})
			.catch(_ => {
				isPath = false;
			});

		return isPath;
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: 'An unknown error occurred'
		);
	}
};
