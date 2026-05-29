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

import {Radio} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {MCUBOOT_ENABLE_OPTIONS} from '../../../../constants/workspace-settings';
import {setMcubootEnableState} from '../../../../state/slices/app-context/appContext.reducer';
import {useMcubootEnableState} from '../../../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../../../state/store';
import styles from './enable-mcuboot.module.scss';

function EnableMCUBoot() {
	const dispatch = useAppDispatch();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.settings?.security?.['mcuboot-settings']?.[
			'enable-mcuboot'
		];

	const mcubootEnableState = useMcubootEnableState();

	return (
		<div
			className={styles.container}
			data-test='workspace-setting:mcuboot-enable-settings'
		>
			<div className={styles.contentWrapper}>
				<div className={styles.title} id='mcuboot-enable-title'>
					{i10n?.title}
				</div>
				<div
					className={styles.content}
					role='radiogroup'
					aria-label={i10n?.title}
				>
					{MCUBOOT_ENABLE_OPTIONS.map(option => (
						<div
							key={option.label}
							className={styles.enableSection}
							data-test={`workspace-setting:mcuboot-enable-${option.value}`}
							onClick={() => {
								dispatch(setMcubootEnableState(option.value));
							}}
						>
							<div className={styles.header}>
								<Radio
									checked={mcubootEnableState === option.value}
									value={option.value}
								>
									{option.label}
								</Radio>
							</div>
							<div className={styles.description}>
								{i10n?.[option.value]}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default EnableMCUBoot;
