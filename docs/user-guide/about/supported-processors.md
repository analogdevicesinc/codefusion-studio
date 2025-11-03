---
description: List of supported processors
author: Analog Devices
date: 2025-09-24
---

# Supported processors

CodeFusion Studio supports a growing number of processors from across Analog Devices' portfolio.

## Supported MSDK processors

Microcontroller Software Development Kit (MSDK) processors support bare-metal projects using the MSDK plugin, as well as Zephyr-based development workflows through dedicated Zephyr plugins. Some MSDK processors also support configuration tools in System Planner and integration with Embedded AI Tools.

| Processor                                                      | Bare-metal SDK[^sdk]| Zephyr | Config Tools[^cfg] | [AI Tools](../ai-tools/index.md)[^ai] | [TESA](../resources/security-resources.md)[^tesa] |
|----------------------------------------------------------------|---------------------|--------|--------------------|---------------|---------------------------------------------------|
| [MAX32650](https://www.analog.com/en/products/max32650.html)   | Yes                 | Yes    | Yes                | No            | Yes                                               |
| [MAX32655](https://www.analog.com/en/products/MAX32655.html)   | Yes                 | Yes    | Yes                | No            | Partial                                           |
| MAX32657                                                       | No                  | Yes    | Yes                | Yes           | Yes                                               |
| [MAX32660](https://www.analog.com/en/products/max32660.html)   | Yes                 | Yes    | No                 | No            | No                                                |
| [MAX32662](https://www.analog.com/en/products/max32662.html)   | Yes                 | Yes    | No                 | No            | Partial                                           |
| [MAX32666](https://www.analog.com/en/products/max32666.html)   | No                  | Yes    | No                 | No            | No                                                |
| [MAX32670](https://www.analog.com/en/products/max32670.html)   | Yes                 | Yes    | Yes                | No            | Yes                                               |
| [MAX32672](https://www.analog.com/en/products/MAX32672.html)   | Yes                 | Yes    | No                 | No            | Partial                                           |
| [MAX32675C](https://www.analog.com/en/products/max32675c.html) | Yes                 | Yes    | No                 | No            | No                                                |
| [MAX32690](https://www.analog.com/en/products/MAX32690.html)   | Yes                 | Yes    | Yes                | Yes           | Yes                                               |
| [MAX78000](https://www.analog.com/en/products/MAX78000.html)   | Yes                 | Yes    | Yes                | No            | Partial                                           |
| [MAX78002](https://www.analog.com/en/products/MAX78002.html)   | Yes                 | Yes    | Yes                | Yes           | No                                                |

## Supported SHARC-FX processors

SHARC-FX processors support bare-metal projects using a SHARC-FX DSP plugin, with support for Pin Mux configuration in System Planner. All SHARC-FX processors also support Embedded AI Tools for model import, configuration, and code generation.

W variants (automotive-grade) are listed as separate plugin entries in CodeFusion Studio but have the same support level as their corresponding base processors.

| Processor                                                                 | Bare-metal SDK[^sdk]| Zephyr | Config Tools[^cfg] | [AI Tools](../ai-tools/index.md)[^ai] | [TESA](../resources/security-resources.md)[^tesa] |
|---------------------------------------------------------------------------|---------------------|--------|--------------------|---------------|---------------------------------------------------|
| [ADSP-21834 / 21834W](https://www.analog.com/en/products/adsp-21834.html) | Yes                 | No     | Partial            | Yes           | No                                                |
| [ADSP-21835 / 21835W](https://www.analog.com/en/products/adsp-21835.html) | Yes                 | No     | Partial            | Yes           | No                                                |
| [ADSP-21836 / 21836W](https://www.analog.com/en/products/adsp-21836.html) | Yes                 | No     | Partial            | Yes           | No                                                |
| [ADSP-21837 / 21837W](https://www.analog.com/en/products/adsp-21837.html) | Yes                 | No     | Partial            | Yes           | No                                                |
| [ADSP-SC834 / SC834W](https://www.analog.com/en/products/adsp-sc834.html) | Yes                 | No     | Partial            | Yes           | No                                                |
| [ADSP-SC835 / SC835W](https://www.analog.com/en/products/adsp-sc835.html) | Yes                 | No     | Partial            | Yes           | No                                                |

[^sdk]: Indicates support for bare-metal development workflows in CodeFusion Studio, including the MSDK for MAX32xxx and MAX78xxx microcontrollers, and the ADSP-2183x/SC83x SHARC-FX family.
[^cfg]: Indicates support for configuration flows in System Planner. **Yes** = Full support,  **Partial** = Pin Mux only, **No** = Not supported.
[^ai]: Indicates AI Tools support in CodeFusion Studio, including model integration and advanced analysis for embedded AI applications. For details on supported AI model formats see [supported processors and model formats](../ai-tools/supported-ai-model-formats.md).
[^tesa]: TESA security support: **Yes** = Full TESA support including UCL and USS, **Partial** = UCL support only, **No** = Not supported.
