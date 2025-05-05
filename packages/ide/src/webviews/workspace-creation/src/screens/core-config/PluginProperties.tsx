import {memo, useEffect, useMemo, useReducer} from 'react';
import {DynamicForm} from 'cfs-react-library';
import ConfigSection from './layout-components/config-section/ConfigSection';
import ConfigCard from './layout-components/config-card/ConfigCard';
import BrowseFile from './core-config-components/browse-file/BrowseFile';
import {
	coreConfigReducer,
	coreConfigReducerActions
} from './utils/core-config';
import {
	useConfiguredCore,
	useSelectedCoreToConfigId
} from '../../state/slices/workspace-config/workspace-config.selector';
import {
	LOCAL_STORAGE_CORE_CONFIG,
	LOCAL_STORAGE_CORE_CONFIG_ERRORS
} from '../../common/constants/identifiers';
import type {CfsPluginInfo} from 'cfs-lib';

type PlatformOptionsProps = Readonly<{
	pluginInfo: CfsPluginInfo | undefined;
}>;

function PluginProperties({pluginInfo}: PlatformOptionsProps) {
	const coreId = useSelectedCoreToConfigId();
	const coreState = useConfiguredCore(coreId ?? '');
	const controls = useMemo(
		() => pluginInfo?.properties?.project ?? [],
		[pluginInfo]
	);

	const [platformConfig, setPlatformConfig] = useReducer(
		coreConfigReducer,
		{},
		() =>
			Object.keys(coreState?.platformConfig ?? {}).length
				? coreState.platformConfig
				: controls.reduce<Record<string, string | number | boolean>>(
						(acc, prop) => {
							acc[prop.id] = prop.default ?? '';

							return acc;
						},
						{}
					)
	);

	const platformConfigErrors = useMemo(() => {
		const errors: Record<string, string> = {};
		controls.forEach(control => {
			if (control.required && !platformConfig[control.id]) {
				errors[control.id] = `${control.name} is required`;
			}
		});

		return errors;
	}, [controls, platformConfig]);

	const handleConfigChange = (
		fieldId: string,
		data: string | boolean | number
	) => {
		setPlatformConfig({
			type: coreConfigReducerActions.setFormData,
			payload: {
				[fieldId]: data
			}
		});
	};

	useEffect(() => {
		if (!pluginInfo) return;

		localStorage.setItem(
			LOCAL_STORAGE_CORE_CONFIG,
			JSON.stringify({
				pluginId: pluginInfo.pluginId,
				pluginVersion: pluginInfo.pluginVersion,
				firmwarePlatform: pluginInfo.firmwarePlatform,
				platformConfig
			})
		);

		if (Object.keys(platformConfigErrors).length) {
			localStorage.setItem(
				LOCAL_STORAGE_CORE_CONFIG_ERRORS,
				JSON.stringify(platformConfigErrors)
			);
		} else {
			localStorage.removeItem(LOCAL_STORAGE_CORE_CONFIG_ERRORS);
		}

		return () => {
			localStorage.removeItem(LOCAL_STORAGE_CORE_CONFIG);
			localStorage.removeItem(LOCAL_STORAGE_CORE_CONFIG_ERRORS);
		};
	}, [platformConfig, pluginInfo, platformConfigErrors]);

	if (!pluginInfo) return null;

	if (!controls.length)
		return 'No configurable properties found for the selected plugin.';

	return (
		<ConfigSection>
			<span slot='title'>Platform Options</span>
			<ConfigCard>
				<DynamicForm
					testId='core-config-dynamic-form'
					controls={controls}
					data={platformConfig}
					components={{
						buildLogPath: (
							<BrowseFile
								mode='file'
								path={String(platformConfig.buildLogPath ?? '')}
								isDisabled={!platformConfig?.buildLogPathEnabler}
								error={undefined}
								onPathChange={value => {
									handleConfigChange('buildLogPath', value);
								}}
							/>
						)
					}}
					errors={platformConfigErrors}
					onControlChange={handleConfigChange}
				/>
			</ConfigCard>
		</ConfigSection>
	);
}

export default memo(PluginProperties);
