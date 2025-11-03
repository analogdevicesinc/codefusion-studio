/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {useLocaleContext} from '../../../../common/contexts/LocaleContext';
import ConflictIcon from '../../../../common/icons/Conflict';
import {TLocaleContext} from '../../../../common/types/l10n';
import ViewDocumentationIcon from '../../../../common/icons/view-documentation';

export type DataModel = {soc: string; pkg: string; version: string};

type DataModelErrorProps = Readonly<{
	dataModel: DataModel;
}>;

const docLink =
	'https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/package-manager/install-required/';

function DataModelError({dataModel}: DataModelErrorProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.errors.dataModel;

	const {soc, pkg, version} = dataModel;

	const description = `${i10n?.descriptionBegin} ${soc}
				${pkg} ${i10n?.descriptionMid} ${version} ${i10n?.descriptionEnd}`;

	return (
		<div className={styles.errorContainer}>
			<ConflictIcon />
			<div className={styles.errorMessage}>
				<div className={styles.messageTitle}>{i10n?.title}</div>
				<div className={styles.messageBody}>{description}</div>
			</div>
			<div className={styles.linkContainer}>
				<VSCodeLink className={styles.linkText} href={docLink}>
					<span className={styles.linkSpan}>
						{i10n?.linkText}
						<ViewDocumentationIcon />
					</span>
				</VSCodeLink>
			</div>
		</div>
	);
}

export default memo(DataModelError);
