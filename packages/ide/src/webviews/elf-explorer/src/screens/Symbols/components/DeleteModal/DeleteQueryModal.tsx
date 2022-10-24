/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

type DeleteQueryModalProps = {
	readonly query: TSavedQuery | undefined;
};

export default function DeleteQueryModal({
	query
}: DeleteQueryModalProps) {
	return (
		<section className={styles.deleteQuery}>
			<article>
				<Info />
			</article>
			<article>
				<h2>Confirm delete</h2>
				<p>
					Please confirm you wish to delete
					{` "${query?.name ? query?.name : '<no name>'}"`}.
				</p>
			</article>
		</section>
	);
}
