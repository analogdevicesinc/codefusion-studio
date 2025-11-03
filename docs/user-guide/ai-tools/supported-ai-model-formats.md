---
description: Supported processors, cores, and AI model formats in CodeFusion Studio
author: Analog Devices
date: 2025-08-29
---

# Supported processors and model formats

CodeFusion Studio supports multiple AI model formats depending on the processor. Use the table below to check which formats are compatible with your selected device before adding models to your project.

| Processor                                                                 | Supported AI models                          | Supported cores                 |
|---------------------------------------------------------------------------|----------------------------------------------|---------------------------------|
| MAX32657                                                                  | TFLM[^tflm]                                  | Arm Cortex-M33                  |
| [MAX32690](https://www.analog.com/en/products/MAX32690.html)              | TFLM                                         | Arm Cortex-M4                   |
| [MAX78002](https://www.analog.com/en/products/MAX78002.html)              | PyTorch[^pytorch] (CNN only), TFLM (M4 only) | Arm Cortex-M4 + CNN Accelerator |
| [ADSP-21834 / 21834W](https://www.analog.com/en/products/adsp-21834.html) | TFLM                                         | SHARC-FX                        |
| [ADSP-21835 / 21835W](https://www.analog.com/en/products/adsp-21835.html) | TFLM                                         | SHARC-FX                        |
| [ADSP-21836 / 21836W](https://www.analog.com/en/products/adsp-21836.html) | TFLM                                         | SHARC-FX                        |
| [ADSP-21837 / 21837W](https://www.analog.com/en/products/adsp-21837.html) | TFLM                                         | SHARC-FX                        |
| [ADSP-SC834 / SC834W](https://www.analog.com/en/products/adsp-sc834.html) | TFLM                                         | SHARC-FX + Arm Cortex-M33       |
| [ADSP-SC835 / SC835W](https://www.analog.com/en/products/adsp-sc835.html) | TFLM                                         | SHARC-FX + Arm Cortex-M33       |

[^tflm]: TensorFlow Lite for Microcontrollers, a lightweight version of TensorFlow Lite optimized for embedded devices. See [:octicons-link-external-24: tensorflow/tflite-micro](https://github.com/tensorflow/tflite-micro){:target="_blank"}.  
[^pytorch]: PyTorch, an open-source deep learning framework developed by Meta. See [:octicons-link-external-24: pytorch/pytorch](https://github.com/pytorch/pytorch){:target="_blank"}.
