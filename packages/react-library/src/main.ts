/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
	GridCombobox,
	GridComboboxHandle,
	GridComboboxProp
} from './components/grid-combobox/grid-combobox';
import SearchIcon from './components/icons/search-icon';
import CloseIcon from './components/icons/close-icon';
import {CustomizableDropdown} from './components/customizable-dropdown/customizable-dropdown.js';
import InfoIcon from './components/icons/info-icon';
import SearchInput from './components/search-input/search-input';
import DropDown, {
	type DropDownOptions
} from './components/dropdown/dropdown';
import Chip from './components/chip/chip';
import Card from './components/card/card';
import TextField from './components/text-field/textfield';
import {SlidingPanel} from './components/sliding-panel/sliding-panel';
import Button from './components/button/button';
import CheckBox from './components/checkbox/checkbox';
import PanelTab from './components/tabs/panel-tab';
import PanelView from './components/tabs/panel-view';
import Panels from './components/tabs/panels';
import MultiSelect from './components/multiselect/multiselect';
import {MultiSelectOption} from './components/multiselect/multiselect';
import Stepper from './components/stepper/stepper';
import StepList from './components/wizard-stepper/wizard-stepper';
import Badge from './components/badge/badge';
import Divider from './components/divider/divider';
import ProgressRing from './components/progress-ring/progress-ring';
import CfsSuspense from './components/cfs-suspense/cfs-suspense.js';
import DataGrid from './components/table/data-grid';
import DataGridRow from './components/table/data-grid-row';
import DataGridCell from './components/table/data-grid-cell';
import DynamicForm from './components/dynamic-form/dynamic-form.js';
import Radio from './components/radio/radio';
import RadioGroup from './components/radio/radio-group';
import TextArea from './components/text-area/text-area.js';
import HexInputField from './components/hex-input-field/hex-input-field.js';
import ClockConfigIcon from './components/icons/clock-config-icon.js';
import EmbeddedAiToolsIcon from './components/icons/embedded-ai-tools-icon.js';
import GenerateIcon from './components/icons/generate-icon.js';
import MemoryLayoutIcon from './components/icons/memory-layout-icon.js';
import PeripheralsIcon from './components/icons/peripherals-icon.js';
import PlaceholderIcon from './components/icons/placeholder-icon.js';
import RegistersIcon from './components/icons/registers-icon.js';
import PinmuxIcon from './components/icons/pinmux-icon.js';
import PlusIcon from './components/icons/plus-icon.js';
import ErrorBoundary from './components/error-boundary/error-boundary.js';
import ExpandAllIcon from './components/icons/expand-all-icon.js';
import CollapseAllIcon from './components/icons/collapse-all-icon.js';
import CoreIcon from './components/icons/core-icon.js';
import DeleteIcon from './components/icons/delete-icon.js';
import Tooltip from './components/tooltip/tooltip.js';

import {use} from './hooks/use';

import type {
	TFormControl,
	TFormControlType,
	TFormData,
	TFormFieldValue,
	TFormNumericBase
} from './types/dynamic-form';
import type {
	StepListProps,
	Step,
	SubStep
} from './components/wizard-stepper/wizard-stepper';
import ChevronLeftIcon from './components/icons/chevron-left-icon.js';
import MemoryIcon from './components/icons/memory-icon.js';
import HamburgerIcon from './components/icons/hamburger-icon.js';
import DataFlowGasketIcon from './components/icons/data-flow-gasket-icon.js';
import WarningIcon from './components/icons/warning-icon.js';
import ExternalLinkIcon from './components/icons/external-link-icon.js';

export {
	GridCombobox,
	SearchInput,
	DropDown,
	Chip,
	Card,
	CustomizableDropdown,
	TextField,
	HexInputField,
	SlidingPanel,
	Button,
	CheckBox,
	PanelTab,
	PanelView,
	Panels,
	MultiSelect,
	Stepper,
	StepList,
	Badge,
	Divider,
	ProgressRing,
	CfsSuspense,
	ErrorBoundary,
	DataGrid,
	DataGridRow,
	DataGridCell,
	Radio,
	RadioGroup,
	DynamicForm,
	TextArea,
	Tooltip,
	use
};

export type {
	GridComboboxHandle,
	GridComboboxProp,
	DropDownOptions,
	MultiSelectOption,
	TFormControl,
	TFormControlType,
	TFormData,
	TFormFieldValue,
	TFormNumericBase,
	StepListProps,
	Step,
	SubStep
};

export {
	SearchIcon,
	CloseIcon,
	InfoIcon,
	ChevronLeftIcon,
	ClockConfigIcon,
	EmbeddedAiToolsIcon,
	GenerateIcon,
	MemoryLayoutIcon,
	PeripheralsIcon,
	PlaceholderIcon,
	DataFlowGasketIcon,
	RegistersIcon,
	PinmuxIcon,
	MemoryIcon,
	HamburgerIcon,
	PlusIcon,
	ExpandAllIcon,
	CollapseAllIcon,
	CoreIcon,
	DeleteIcon,
	WarningIcon,
	ExternalLinkIcon
};
