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
import React from 'react';

type TDesc = {
	readonly text?: string; // Making text optional
};

export default function ElfHeaderModalDescription({text}: TDesc) {
	if (!text) {
		return null;
	}

	return (
		<>
			{text.split('\n').map((line, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<React.Fragment key={index}>
					{line}
					<br />
				</React.Fragment>
			))}
		</>
	);
}
