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
import Home from '@common/icons/Home';
import PinMUX from '@common/icons/PinMUX';
import ClockIcon from '@common/icons/Clock';
import Registers from '@common/icons/Registers';
import Generate from '@common/icons/Generate';
import {navigationItems} from '@common/constants/navigation';
import {
	MemoryLayoutIcon,
	PeripheralsIcon,
	DataFlowGasketIcon
} from 'cfs-react-library';
import EmbeddedAITools from '../../../common/icons/EmbeddedAITools';
import {ProfilingIcon} from '../../../common/icons/Profiling';

export const availableIcons = [
	{
		icon: <Home />,
		id: navigationItems.dashboard,
		tooltipLabel: 'Dashboard'
	},
	{
		icon: <PeripheralsIcon />,
		id: navigationItems.peripherals,
		tooltipLabel: 'Peripheral Allocation'
	},
	{
		icon: <PinMUX />,
		id: navigationItems.pinmux,
		tooltipLabel: 'Pin Config'
	},
	{
		icon: <ClockIcon />,
		id: navigationItems.clockConfig,
		tooltipLabel: 'Clock Config'
	},
	{
		icon: <DataFlowGasketIcon width={24} height={24} />,
		id: navigationItems.dfg,
		tooltipLabel: 'Data Flow Gasket'
	},
	{
		icon: <MemoryLayoutIcon width={24} height={24} />,
		id: navigationItems.memory,
		tooltipLabel: 'Memory Allocation'
	},
	{
		icon: <Registers />,
		id: navigationItems.registers,
		tooltipLabel: 'Registers'
	},
	{
		icon: <EmbeddedAITools />,
		id: navigationItems.aiTools,
		tooltipLabel: 'Embedded AI Tools'
	},
	{
		icon: <ProfilingIcon />,
		id: navigationItems.profiling,
		tooltipLabel: 'Profiling'
	},
	{
		icon: <Generate />,
		id: navigationItems.generate,
		tooltipLabel: 'Generate Code'
	}
];
