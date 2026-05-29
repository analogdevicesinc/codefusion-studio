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

import {
	type CustomTLV,
	type Image
} from '../../../../types/application-packages';
import {type ImageValidationErrors} from '../../../../utils/application-package-validation';
import ImageForms from '../image-forms/image-forms';

type ImageContentProps = Readonly<{
	currentImage: Image;
	errors: ImageValidationErrors;
	newlyAddedTlvId?: string;
	onUpdateImage: (updates: Partial<Omit<Image, 'id'>>) => void;
	onAddCustomTLV: () => void;
	onDeleteCustomTLV: (tlvId: string) => void;
	onUpdateCustomTLV: (
		tlvId: string,
		updates: Partial<Omit<CustomTLV, 'id'>>
	) => void;
}>;

function ImageContent({
	currentImage,
	errors,
	onUpdateImage,
	onAddCustomTLV,
	onDeleteCustomTLV,
	onUpdateCustomTLV,
	newlyAddedTlvId
}: ImageContentProps) {
	return (
		<ImageForms
			currentImage={currentImage}
			errors={errors}
			newlyAddedTlvId={newlyAddedTlvId}
			onUpdateImage={onUpdateImage}
			onAddCustomTLV={onAddCustomTLV}
			onDeleteCustomTLV={onDeleteCustomTLV}
			onUpdateCustomTLV={onUpdateCustomTLV}
		/>
	);
}

export default ImageContent;
