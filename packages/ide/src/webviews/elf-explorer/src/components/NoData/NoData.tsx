/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {Divider} from 'cfs-react-library';
import styles from './NoData.module.scss';
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';

type NoDataProps = {
	readonly content?: string;
};

export default function NoData({content}: NoDataProps) {
	const l10n = useLocaleContext()?.common as
		| Record<string, string>
		| undefined;

	return (
		<div data-test='no-data:container'>
			<Divider />
			<div className={styles.content}>
				{content ??
					l10n?.noInformationAvailable ??
					'No information available'}
			</div>
		</div>
	);
}
