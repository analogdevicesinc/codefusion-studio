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

import ConflictIcon from '@common/icons/Conflict';
import CircledCheckmarkIcon from '@common/icons/CircledCheckmark';

export default function ValidStatus({
	errorsNumber,
	testId
}: Readonly<{errorsNumber: number; testId: string}>) {
	return errorsNumber ? (
		<>
			<div data-test={`${testId}:error-state`}>
				{errorsNumber} Issues
			</div>
			<ConflictIcon />
		</>
	) : (
		<>
			<span data-test={`${testId}:ready-state`}>Ready</span>
			<CircledCheckmarkIcon />
		</>
	);
}
