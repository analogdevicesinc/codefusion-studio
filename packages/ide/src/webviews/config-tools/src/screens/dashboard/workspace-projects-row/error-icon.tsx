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

import {use} from 'cfs-react-library';
import useArePinAssignmentsMissingRequired from '../../../hooks/useArePinAssignmentsMissingRequired';
import ConflictIcon from '../../../../../common/icons/Conflict';

import type {PeripheralConfig} from '../../../types/peripherals';
import type {ControlCfg} from '../../../../../common/types/soc';

import styles from './workspace-projects-row.module.scss';

export default function ErrorIcon({
	peripherals,
	controlsPromise
}: Readonly<{
	peripherals: Record<string, PeripheralConfig>;
	controlsPromise: Promise<Record<string, ControlCfg[]>>;
}>) {
	const controls = use(controlsPromise);

	const peripheralErr = useArePinAssignmentsMissingRequired(
		peripherals,
		controls
	);

	return (
		Boolean(peripheralErr) && <ConflictIcon className={styles.icon} />
	);
}
