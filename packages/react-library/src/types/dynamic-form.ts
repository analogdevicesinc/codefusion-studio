// The interface accepted by the dynamic form
// to be updated based on the Plugin Manager API
export type TFormControl = {
	id: string;
	/** Property name */
	name: string;
	/** Property type; it tells the component what UI element to render */
	type: TFormControlType;
	/** Property description; only used for checkbox label */
	description?: string;
	/** Default value */
	default?: string | number | boolean;
	/** Placeholder text */
	placeholder?: string;
	/** Valid options, presented as a drop down list */
	enum?: Array<{label: string; value: string}>;
	/** Disabled state of the control in the UI */
	disabled?: boolean;
	/** Required fields will be checked at runtime to ensure they are set */
	required?: boolean;
	/** Category of the control. Used for filtering purposes */
	pluginOption?: boolean;
};

export type TFormControlType =
	| 'string'
	| 'number'
	| 'textarea'
	| 'boolean'
	| 'array'
	| (string & Record<never, never>); // For cases where we receive controls that will be added as custom component and we don't know the type

export type TFormData = Record<string, boolean | string | number>;

export type TFormFieldValue = TFormData[string];
