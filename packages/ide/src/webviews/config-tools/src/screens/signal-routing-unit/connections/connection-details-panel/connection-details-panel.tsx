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

import {useEditableConnections} from '../../../../state/slices/sru/sru.selector';
import {InputConnectionDetails} from './input-connection-details';
import {OutputConnectionDetails} from './output-connection-details';

/**
 * Right-side overlay panel showing connection details on the SRU Connections
 * subscreen.
 *
 * Picks the input or output variant for the signal being edited. Both variants
 * are keyed by signal name so switching signals remounts them, discarding any
 * staged edits instead of resyncing them from the store.
 */
export function ConnectionDetailsPanel() {
	const connection = useEditableConnections()?.[0];

	if (connection?.input) {
		return (
			<InputConnectionDetails
				key={connection.input.Name}
				input={connection.input}
				peripheralName={connection.peripheralName}
			/>
		);
	}

	if (connection?.output) {
		return (
			<OutputConnectionDetails
				key={connection.output.Name}
				output={connection.output}
				peripheralName={connection.peripheralName}
			/>
		);
	}

	return null;
}
