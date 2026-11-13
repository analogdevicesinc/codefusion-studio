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
import LeftArrow from '@common/icons/LeftArrow';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import styles from './DetailsView.module.scss';

type DetailsViewProps = {
	readonly body: React.ReactNode;
	readonly handleBackClick: () => void;
};

export default function DetailsView({
	body,
	handleBackClick
}: DetailsViewProps) {
	const l10n = useLocaleContext()?.common as
		| Record<string, string>
		| undefined;

	return (
		<div id='details-container' data-test='details-view:container'>
			<div
				className={styles.navigationControl}
				onClick={handleBackClick}
			>
				<div className={styles.backIcon}>
					<LeftArrow />
				</div>
				<span>{l10n?.back ?? 'Back'}</span>
			</div>
			{body}
		</div>
	);
}
