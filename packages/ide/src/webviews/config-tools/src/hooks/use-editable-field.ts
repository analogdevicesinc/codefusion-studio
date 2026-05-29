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
import {useCallback, useEffect, useRef, useState} from 'react';

type EditableFieldOptions = {
	readonly initialValue: string;
	readonly onConfirm: (value: string) => void;
	readonly allowEmpty?: boolean;
	readonly maxLength?: number;
	readonly sanitize?: (value: string) => string;
};

export type EditableField = {
	isEditing: boolean;
	editValue: string;
	isDirty: boolean;
	inputRef: React.RefObject<HTMLInputElement>;
	maxLength?: number;
	startEditing: () => void;
	confirmEdit: () => void;
	cancelEdit: () => void;
	setEditValue: (value: string) => void;
};

export function useEditableField({
	initialValue,
	onConfirm,
	allowEmpty = false,
	maxLength,
	sanitize
}: EditableFieldOptions): EditableField {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const confirmEditRef = useRef<() => void>();

	const isDirty = editValue !== initialValue;

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
		}
	}, [isEditing]);

	const startEditing = useCallback(() => {
		const sanitized = sanitize
			? sanitize(initialValue)
			: initialValue;
		setEditValue(sanitized);
		setIsEditing(true);
	}, [initialValue, sanitize]);

	const confirmEdit = useCallback(() => {
		const trimmed = editValue.trim();
		const sanitized = sanitize ? sanitize(trimmed) : trimmed;

		if (!allowEmpty && !sanitized) return;

		onConfirm(sanitized);
		setIsEditing(false);
	}, [editValue, onConfirm, allowEmpty, sanitize]);

	useEffect(() => {
		confirmEditRef.current = confirmEdit;
	}, [confirmEdit]);

	useEffect(() => {
		if (!isEditing) return;

		const handleOutsideClick = (e: MouseEvent) => {
			if (
				inputRef.current &&
				!inputRef.current.contains(e.target as Node)
			) {
				confirmEditRef.current?.();
			}
		};

		document.addEventListener('mousedown', handleOutsideClick);

		return () => {
			document.removeEventListener('mousedown', handleOutsideClick);
		};
	}, [isEditing]);

	const cancelEdit = useCallback(() => {
		setIsEditing(false);
	}, []);

	const handleSetEditValue = useCallback(
		(value: string) => {
			const sanitized = sanitize ? sanitize(value) : value;

			setEditValue(sanitized);

			// Imperatively update the web component's displayed value
			// when sanitization strips characters, since the shadow DOM
			// input does not re-sync from React state during user input.
			if (sanitize && inputRef.current && sanitized !== value) {
				inputRef.current.value = sanitized;
			}
		},
		[sanitize]
	);

	return {
		isEditing,
		editValue,
		isDirty,
		inputRef,
		maxLength,
		startEditing,
		confirmEdit,
		cancelEdit,
		setEditValue: handleSetEditValue
	};
}
