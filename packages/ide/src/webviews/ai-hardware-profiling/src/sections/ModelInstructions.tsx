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

import {Button, DropDown, InfoIcon, Tooltip} from 'cfs-react-library';
import {useLocaleContext} from '../../../common/contexts/LocaleContext';
import styles from './ModelInstructions.module.scss';
import {useCallback} from 'react';
import {type Messenger} from 'vscode-messenger-webview';
import {
	type ApplicationStatus,
	type HardwareResources,
	type ProfilingConfiguration
} from "@ide-types/ai-hardware-profiling-types";

import {
	deployModelForProfiling,
	stopDeployment,
	updateProfilingConfiguration
} from "@constants/messages/ai-hardware-profiling-messages";
import {LocalizedMessage} from '../../../common/components/l10n/LocalizedMessage';

type ModelInstructionsProps = Readonly<{
	profilingConfig: ProfilingConfiguration;
	setProfilingConfig: React.Dispatch<
		React.SetStateAction<ProfilingConfiguration>
	>;
	hardwareResources: HardwareResources;
	messenger: Messenger;
	applicationStatus: ApplicationStatus;
}>;

export function ModelInstructions({
	profilingConfig,
	hardwareResources,
	applicationStatus,
	messenger,
	setProfilingConfig
}: ModelInstructionsProps) {
	const l10n = useLocaleContext();

	const updateProfilingConfig = useCallback(
		(updated: Partial<ProfilingConfiguration>) => {
			setProfilingConfig(prev => {
				const newConfig = {...prev, ...updated};
				messenger.sendNotification(
					updateProfilingConfiguration,
					{type: 'extension'},
					newConfig
				);

				return newConfig;
			});
		},
		[messenger, setProfilingConfig]
	);


	return (
		<div className={styles.container}>
			<h1>Model Instructions</h1>
			<section>
				<h2>{l10n?.howToTitle}</h2>
				<p>
					<LocalizedMessage id='howToDescription1' />
					<br />
					<LocalizedMessage
						id='howToDescription2'
						params={{portNumber: hardwareResources.port ?? 'N/A'}}
					/>
				</p>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/user-guide/debugging/connect-hardware/'>
					{l10n?.readMore}
				</a>
			</section>
			<section>
				<h2>{l10n?.captureOutputTitle}</h2>
				<p>
					<LocalizedMessage
						id='captureOutputDescription'
						params={{portNumber: hardwareResources.port ?? 'N/A'}}
					/>
				</p>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/user-guide/debugging/connect-hardware/#identify-your-serial-port'>
					{l10n?.readMore}
				</a>
				<p>{l10n?.config.description}</p>
				<div className={styles.configContainer}>
					<div className={styles.dropdownContainer}>
						{hardwareResources.usbPorts.length > 0 && (
							<div>
								<label htmlFor='usb-port'>
									{l10n?.config.usbPortLabel}
									<Tooltip
										title={l10n?.config.usbPortTooltip}
										type='short'
									>
										<InfoIcon />
									</Tooltip>
								</label>
								<DropDown
									options={hardwareResources.usbPorts.map(port => ({
										label: port,
										value: port
									}))}
									noValueOption={{
										label: l10n?.config.usbPortPlaceholder,
										value: ''
									}}
									controlId='usb-port'
									currentControlValue={
										profilingConfig.selectedUsbPort
									}
									onHandleDropdown={val => {
										updateProfilingConfig({selectedUsbPort: val});
									}}
								/>
							</div>
						)}
						{hardwareResources.debuggers.length > 0 && (
							<div>
								<label htmlFor='run-with-select'>
									{l10n?.config.runWithLabel}
								</label>
								<DropDown
									options={hardwareResources.debuggers.map(
										debuggerName => ({
											label: debuggerName,
											value: debuggerName
										})
									)}
									controlId='debugger-select'
									noValueOption={{
										label: l10n?.config.runWithPlaceholder,
										value: ''
									}}
									currentControlValue={
										profilingConfig.selectedDebugger
									}
									onHandleDropdown={val => {
										updateProfilingConfig({
											selectedDebugger: val
										});
									}}
								/>
							</div>
						)}
					</div>
					<div className={styles.buttonContainer}>
						<Button
							disabled={
								applicationStatus.buildStatus !== 'built' ||
								applicationStatus.deployStatus === 'deploying' ||
								applicationStatus.deployStatus === 'running' ||
								!profilingConfig.selectedUsbPort ||
								!profilingConfig.selectedDebugger
							}
							onClick={() => {
								messenger.sendNotification(deployModelForProfiling, {
									type: 'extension'
								});
							}}
						>
							{l10n?.config.run}
						</Button>
						<Button
							disabled={applicationStatus.deployStatus !== 'running'}
							onClick={() => {
								messenger.sendNotification(stopDeployment, {
									type: 'extension'
								});
							}}
						>
							{l10n?.config.stop}
						</Button>
					</div>
				</div>
			</section>
			<section>
				<h2>{l10n?.usefullLinks.title}</h2>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/user-guide/tools/compat-report/'>
					{l10n?.usefullLinks.compat}
				</a>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/user-guide/tools/profiling-report/'>
					{l10n?.usefullLinks.profiling}
				</a>
				<a href='https://developer.analog.com/docs/codefusion-studio/latest/user-guide/workspaces/create-workspace-from-ai-model/'>
					{l10n?.usefullLinks.openWorkspace}
				</a>
			</section>
		</div>
	);
}
