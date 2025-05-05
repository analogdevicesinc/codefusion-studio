/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import {memo} from 'react';
import {DynamicForm, type TFormFieldValue} from 'cfs-react-library';
import {type ControlCfg} from '../../../../../common/types/soc';
import {formatControlsForDynamicForm} from '../../../utils/soc-controls';

import styles from './PluginOptions.module.scss';

type PluginOptionsProps = Readonly<{
	config?: Record<string, any>;
	pluginControls: ControlCfg[];
	onChange: (controlId: string, value: TFormFieldValue) => void;
}>;

export const PluginOptions = memo(
	({config = {}, pluginControls, onChange}: PluginOptionsProps) => {
		const formattedPluginControls = formatControlsForDynamicForm(
			pluginControls,
			config,
			{}
		);

		return (
			<div className={styles.options}>
				{formattedPluginControls.length === 0 ? (
					<p className={styles.noPluginOptions}>
						No plugin options available
					</p>
				) : (
					<DynamicForm
						controls={formattedPluginControls}
						data={config}
						testId='plugin-options-form'
						onControlChange={onChange}
					/>
				)}
			</div>
		);
	}
);
