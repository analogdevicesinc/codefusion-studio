import {memo, useEffect, useMemo, useState} from 'react';
import {DynamicForm, use} from 'cfs-react-library';
import ConfigSection from './layout-components/config-section/ConfigSection';
import ConfigCard from './layout-components/config-card/ConfigCard';
import BrowseFile from './core-config-components/browse-file/BrowseFile';
import {useConfiguredCore} from '../../state/slices/workspace-config/workspace-config.selector';
import {
	LOCAL_STORAGE_CORE_CONFIG,
	LOCAL_STORAGE_CORE_CONFIG_ERRORS
} from '../../common/constants/identifiers';
import type {CfsPluginInfo, CfsPluginProperty} from 'cfs-lib';

type PlatformOptionsProps = Readonly<{
	pluginInfo: CfsPluginInfo | undefined;
	coreId: string;
	propertiesPromise: Promise<CfsPluginProperty[]>;
}>;

function PluginProperties({
	pluginInfo,
	coreId,
	propertiesPromise
}: PlatformOptionsProps) {
	const coreState = useConfiguredCore(coreId ?? '');
	const controls = use(propertiesPromise);

	const [config, setConfig] = useState<
		Record<string, string | number | boolean>
	>({});

	const defaultConfig = useMemo(
		() =>
			Object.keys(coreState?.platformConfig ?? {}).length
				? (coreState!.platformConfig as Record<
						string,
						string | number | boolean
					>)
				: controls.reduce<Record<string, string | number | boolean>>(
						(acc, prop) => {
							acc[prop.id] = prop.default ?? '';
							return acc;
						},
						{}
					),
		[controls, coreState]
	);

	const platformConfig = useMemo(
		() => ({...defaultConfig, ...config}),
		[defaultConfig, config]
	);

	const platformConfigErrors = useMemo(() => {
		const errors: Record<string, string> = {};
		controls.forEach(control => {
			if (control.required && !platformConfig[control.id]) {
				errors[control.id] = `${control.name} is required`;
			}
		});

		if (
			platformConfig.ProjectName &&
			(platformConfig.ProjectName as string).length > 0 &&
			(platformConfig.ProjectName as string).includes(' ')
		) {
			errors.ProjectName = `Project Name cannot contain spaces.`;
		}

		return errors;
	}, [controls, platformConfig]);

	const handleConfigChange = (
		fieldId: string,
		value: string | boolean | number
	) => {
		setConfig(prev => ({...prev, [fieldId]: value}));
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

	if (!controls.length) {
		return (
			<span>
				No configurable properties found for the selected plugin.
			</span>
		);
	}

	return (
		<ConfigSection>
			<span slot='title'>Platform Options</span>
			<ConfigCard>
				<DynamicForm
					testId='core-config:dynamic-form'
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
