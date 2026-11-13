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
import Info from '@common/icons/Info';

import type {TSavedQuery} from '../../../../common/types/symbols';

import styles from './DeleteQueryModal.module.scss';
import {useLocaleContext} from '../../../../../../common/contexts/LocaleContext';

type DeleteQueryModalProps = {
	readonly query: TSavedQuery | undefined;
};

export default function DeleteQueryModal({
	query
}: DeleteQueryModalProps) {
	const l10n = useLocaleContext()?.symbolExplorer as
		| Record<string, string>
		| undefined;

	return (
		<section
			className={styles.deleteQuery}
			data-test='symbols:delete-modal-container'
		>
			<article>
				<Info />
			</article>
			<article>
				<h2>{l10n?.confirmDelete ?? 'Confirm delete'}</h2>
				<p>
					{(
						l10n?.confirmDeleteMessage ??
						'Please confirm you wish to delete "{name}".'
					).replace('{name}', () =>
						query?.name ? query.name : (l10n?.noName ?? '<no name>')
					)}
				</p>
			</article>
		</section>
	);
}
