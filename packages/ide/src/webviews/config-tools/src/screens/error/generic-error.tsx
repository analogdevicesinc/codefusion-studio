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
import {memo} from 'react';
import styles from './error.module.scss';
import {VSCodeLink} from '@vscode/webview-ui-toolkit/react';
import ConflictIcon from '../../../../common/icons/Conflict';
import ViewDocumentationIcon from '../../../../common/icons/view-documentation';

type GenericErrorProps = Readonly<{
	title: string;
	description: string;
	items?: string[];
	docLink?: string;
}>;

function GenericError({
	title,
	description,
	items,
	docLink
}: GenericErrorProps) {
	return (
		<div className={styles.errorContainer}>
			<ConflictIcon />
			<div className={styles.errorMessage}>
				<div className={styles.messageTitle}>{title}</div>
				<div className={styles.messageBody}>{description}</div>
				{items && items.length > 0 && (
					<div className={styles.errorList}>
						{items.map(item => (
							<div key={item}>{`- ${item}`}</div>
						))}
					</div>
				)}
			</div>
			{docLink && (
				<div className={styles.linkContainer}>
					<VSCodeLink className={styles.linkText} href={docLink}>
						<span className={styles.linkSpan}>
							View Documentation
							<ViewDocumentationIcon />
						</span>
					</VSCodeLink>
				</div>
			)}
		</div>
	);
}

export default memo(GenericError);
