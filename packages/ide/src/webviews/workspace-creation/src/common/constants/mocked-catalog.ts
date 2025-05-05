import type {SoC} from 'cfs-ccm-lib';

export const mockedCatalog: SoC[] = [
	{
		boards: [
			{
				description:
					'The AD-APARD32690-SL is a platform for prototyping intelligent, secure, and connected field devices. It has an Arduino Mega-compatible form factor and two Pmod™-compatible connectors.',
				id: 'AD-APARD32690-SL',
				name: 'AD-APARD32690-SL',
				packageIDs: ['WLP'],
				socID: 'MAX32690',
				productUrl: '/'
			},
			{
				description:
					'The MAX32690 evaluation kit (EV kit) provides a platform for evaluating the capabilities of the MAX32690 microcontroller, which is an advanced system-on-chip (SoC). It features an Arm® Cortex®-M4F CPU for efficient computation of complex functions and algorithms, and the latest generation Bluetooth® 5 Low Energy (Bluetooth LE) radio designed for wearable and hearable fitness devices, portable and wearable wireless medical devices, industrial sensors/networks, internet of things (IoT), and asset tracking.',

				id: 'EvKit_V1',

				name: 'EvKit_V1',
				packageIDs: ['TQFN'],
				socID: 'max32690',

				productUrl: '/'
			},
			{
				description:
					'The MAX32690 evaluation kit (EV kit) provides a platform for evaluating the capabilities of the MAX32690 microcontroller, which is an advanced system-on-chip (SoC). It features an Arm® Cortex®-M4F CPU for efficient computation of complex functions and algorithms, and the latest generation Bluetooth® 5 Low Energy (Bluetooth LE) radio designed for wearable and hearable fitness devices, portable and wearable wireless medical devices, industrial sensors/networks, internet of things (IoT), and asset tracking.',

				id: 'FTHR',

				name: 'EvKit_V1',
				packageIDs: ['TQFN'],
				socID: 'max32690',

				productUrl: 'https://wwww.analog.com'
			}
		],
		cores: [
			{
				dataModelCoreID: 'CM4',
				id: 'Arm Cortex-M4F',
				name: 'Arm Cortex-M4F',
				socID: 'MAX32690',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: true
			},
			{
				dataModelCoreID: 'RV',
				id: 'RISC-V',
				name: 'RISC-V',
				socID: 'MAX32690',
				description: 'Some sort of description.',
				coreType: {
					architecture: '',
					id: '',
					isa: ''
				},
				extensions: ['ext1', 'ex2'],
				primary: false
			}
		],
		description:
			'The MAX32690 microcontroller (MCU) is an advanced system-on-chip (SoC) featuring an Arm® Cortex®-M4F CPU, large flash and SRAM memories, and the latest generation Bluetooth® 5.2 Low Energy (LE) radio. This device unites processing horsepower with the connectivity required for IoT applications.',
		id: 'MAX32690',
		name: 'MAX32690',
		family: {
			id: 'max32xxx',
			name: 'MAX32XXX'
		},
		packages: [
			{
				description: '',
				id: 'CSP_BGA',
				name: 'MAX32690-tqfn',
				socID: 'MAX32690',
				packageType: 'TQFN'
			},
			{
				description: '',
				id: 'TQFN',
				name: 'TQFN',
				socID: 'MAX32690',
				packageType: 'CSBGA'
			},
			{
				description: '',
				id: 'WLP',
				name: 'WLP',
				socID: 'MAX32690',
				packageType: 'WLP'
			}
		]
	},
	{
		boards: [
			{
				description:
					'The MAX78002 evaluation kit (EV kit) provides a platform and tools for leveraging device capabilities to build new generations of artificial intelligence (AI) products.',

				id: 'max78002-evkit_v1',

				name: 'max78002-evkit_v1',
				packageIDs: ['max78002-csbga'],
				socID: 'max78002'
			}
		],
		cores: [
			{
				dataModelCoreID: 'CM4',
				id: 'armcortexm4',
				name: 'armCortexM4',
				socID: 'max78002',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: true
			},
			{
				dataModelCoreID: 'RV',
				id: 'risc-v-32-bit',
				name: 'RISC-V 32-bit',
				socID: 'max78002',
				description:
					'General purpose uses on 32 bits with support for compressed instructions.',
				coreType: {
					architecture: 'RV32',
					id: 'rv32_rv32i',
					isa: 'rv32i'
				},
				extensions: ['G', 'C'],
				primary: false
			}
		],
		description:
			"Artificial intelligence (AI) requires extreme computational horsepower, but Maxim is cutting the power cord from AI insights. The MAX78002 is a new breed of AI microcontroller built to enable neural networks to execute at ultra-low power and live at the edge of the IoT. This product combines the most energy-efficient AI processing with Maxim's proven ultra-low power microcontrollers. Our hardware-based convolutional neural network (CNN) accelerator enables battery-powered applications to execute AI inferences while spending only millijoules of energy.",
		id: 'max78002',
		name: 'MAX78002',
		family: {
			id: 'max78xxx',
			name: 'MAX78XXX'
		},
		packages: [
			{
				description: '',
				id: 'max78002-csbga',
				name: 'max78002-csbga',
				socID: 'max78002',
				packageType: 'CSBGA'
			}
		]
	},
	{
		boards: [
			{
				description:
					'The MAX32691 evaluation kit (EV kit) provides a platform for evaluating the capabilities of the MAX32691 microcontroller, which is an advanced system-on-chip (SoC). It features an Arm® Cortex®-M4F CPU for efficient computation of complex functions and algorithms, and the latest generation Bluetooth® 5 Low Energy (Bluetooth LE) radio designed for wearable and hearable fitness devices, portable and wearable wireless medical devices, industrial sensors/networks, internet of things (IoT), and asset tracking.',

				id: 'MAX32691-evkit_v1',

				name: 'MAX32691-evkit_v1',
				packageIDs: ['MAX32691-tqfn'],
				socID: 'MAX32691'
			}
		],
		cores: [
			{
				dataModelCoreID: 'CM4-2',
				id: 'armcortexm4-2',
				name: 'armCortexM4-2',
				socID: 'MAX32691',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: true
			}
		],
		description: 'this item is mocked',
		id: 'max32691',
		name: 'MAX32691',
		family: {
			id: 'max32xxx',
			name: 'MAX32XXX'
		},
		packages: [
			{
				description: '',
				id: 'MAX32691-tqfn',
				name: 'MAX32691-tqfn',
				socID: 'MAX32691',
				packageType: 'TQFN'
			}
		]
	},
	{
		boards: [
			{
				description:
					'The AD-APARD32655-SL is a platform for prototyping intelligent, secure, and connected field devices. It has an Arduino Mega-compatible form factor and two Pmod™-compatible connectors.',

				id: 'AD-APARD32655-SL',

				name: 'AD-APARD32655-SL',
				packageIDs: ['WLP'],
				socID: 'MAX32655',

				productUrl: '/'
			},
			{
				description:
					'The MAX32655 evaluation kit (EV kit) provides a platform for evaluating the capabilities of the MAX32655 microcontroller, which is an advanced system-on-chip (SoC). It features an Arm® Cortex®-M4F CPU for efficient computation of complex functions and algorithms, and the latest generation Bluetooth® 5 Low Energy (Bluetooth LE) radio designed for wearable and hearable fitness devices, portable and wearable wireless medical devices, industrial sensors/networks, internet of things (IoT), and asset tracking.',

				id: 'EvKit_V1',

				name: 'EvKit_V1',
				packageIDs: ['TQFN'],
				socID: 'MAX32655',

				productUrl: '/'
			}
		],
		cores: [
			{
				dataModelCoreID: 'CM4',
				id: 'Arm Cortex M85F',
				name: 'Arm Cortex M85F',
				socID: 'MAX32655',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: true
			},
			{
				dataModelCoreID: 'CM35',
				id: 'Arm Cortex M35F',
				name: 'Arm Cortex M35F',
				socID: 'MAX32655',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: false
			}
		],
		description:
			'The MAX32655 microcontroller (MCU) is an advanced system-on-chip (SoC) featuring an Arm® Cortex®-M4F CPU, large flash and SRAM memories, and the latest generation Bluetooth® 5.2 Low Energy (LE) radio. This device unites processing horsepower with the connectivity required for IoT applications.',
		id: 'MAX32655',
		name: 'MAX32655',
		family: {
			id: 'max32xxx',
			name: 'MAX32XXX'
		},
		packages: [
			{
				description: '',
				id: 'TQFN',
				name: 'TQFN',
				socID: 'MAX32655',
				packageType: 'TQFN'
			},
			{
				description: '',
				id: 'WLP',
				name: 'WLP',
				socID: 'MAX32655',
				packageType: 'WLP'
			}
		]
	},
	{
		boards: [],
		cores: [
			{
				dataModelCoreID: 'CM85-1',
				id: 'Arm Cortex M85F-1',
				name: 'Arm Cortex M85F',
				socID: 'MAX32672',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: true
			},
			{
				dataModelCoreID: 'CM85-2',
				id: 'Arm Cortex M85F-2',
				name: 'Arm Cortex M85F',
				socID: 'MAX32672',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: false
			},
			{
				dataModelCoreID: 'CM85-3',
				id: 'Arm Cortex M35F',
				name: 'AArm Cortex M35F',
				socID: 'MAX32672',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: false
			}
		],
		description:
			'High-Reliability, Tiny, Ultra-Low-Power Arm Cortex-M4F Microcontroller with 12-Bit 1MSPS ADC.',
		id: 'MAX32672',
		name: 'MAX32672',
		family: {
			id: 'max32xxx',
			name: 'MAX32XXX'
		},
		packages: []
	},
	{
		boards: [],
		cores: [
			{
				dataModelCoreID: 'CM85-1',
				id: 'Arm Cortex M85F-1',
				name: 'Arm Cortex M85F',
				socID: 'MAX32675',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: true
			},
			{
				dataModelCoreID: 'CM85-2',
				id: 'Arm Cortex M85F-2',
				name: 'Arm Cortex M85F',
				socID: 'MAX32675',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: false
			},
			{
				dataModelCoreID: 'CM85-3',
				id: 'Arm Cortex M35F',
				name: 'AArm Cortex M35F',
				socID: 'MAX32675',
				description: 'Some sort of description.',
				coreType: {
					architecture: 'Armv7E-M',
					id: 'armv7e-m_thumb-/-thumb-2',
					isa: 'Thumb / Thumb-2'
				},
				extensions: ['ext1', 'ex2'],
				primary: false
			}
		],
		description:
			'High-Reliability, Tiny, Ultra-Low-Power Arm Cortex-M4F Microcontroller with 12-Bit 1MSPS ADC.',
		id: 'MAX32675',
		name: 'MAX32675',
		family: {
			id: 'max32xxx',
			name: 'MAX32XXX'
		},
		packages: []
	}
];
