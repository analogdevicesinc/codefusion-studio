<!-- markdownlint-disable -->

*[activity bar]: Navigation bar on the left side of VS Code with context-specific menus.

*[ADI]: Analog Devices Inc

*[AEABI]: Arm Embedded Application Binary Interface

*[AI]: Artificial Intelligence

*[API]: Application Programming Interface

*[arena]: The working memory buffer used by TensorFlow Lite Micro during model inference. The arena size can be specified manually or estimated automatically.

*[Arm]: Advanced RISC machine. A number of related instruction set architectures (ISAs) maintained and licensed by Arm Holdings. In CodeFusion Studio, ARM refers to an ARM Cortex-M core, such as the Cortex-M4 used in MAX32xxx and MAX78xxx microcontrollers.

*[ARM]: Advanced RISC machine. A number of related instruction set architectures (ISAs) maintained and licensed by Arm Holdings. In CodeFusion Studio, ARM refers to an ARM Cortex-M core, such as the Cortex-M4 used in MAX32xxx and MAX78xxx microcontrollers.

*[BFAR]: BusFault Address Register. An ARM Cortex-M register that contains the memory address that caused a BusFault. Valid only when the BFARVALID bit in the CFSR is set.

*[BSP]: Board Support Package. The layer of software containing hardware-specific boot firmware and device drivers.

*[CMSIS]: Common Microcontroller Software Interface Standard. A set of APIs, software components, tools and workflows to simplify software development.

*[command palette]: Searchable access to commands within VS Code, accessed via Control+Shift+P (Windows/Linux) or Command+Shift+P (Mac).

*[CFS]: CodeFusion Studio

*[CFSR]: Configurable Fault Status Register. An ARM Cortex-M register that provides detailed information about the cause of a fault, covering MemManage, BusFault, and UsageFault fault types.

*[CNN]: Convolutional Neural Network. A type of deep learning model designed to process and classify visual data by applying convolutional layers that automatically extract spatial features.

*[CPU]: Central Processing Unit

*[CSS]: Core Subsystem

*[CTF]: Common Trace Format. A high-performance binary trace format designed for efficient recording and analysis of trace data.

*[DDE]: DMA Engine. Varies by SoC; in some devices it means "Dedicated DMA Engine" and in others "Distributed DMA Engine."

*[DSP]: Digital Signal Processor

*[DSS]: DSP Subsystem

*[ELF]: Executable and Linkable Format. A standard file format commonly used by embedded compilers to store object code and libraries. These files can be executed natively on some systems, or parsed to program the flash member on an embedded device.

*[FastDSP]: A digital signal processing core developed by Analog Devices. The path from the analog input through the DSP core to the analog output is optimized for low-latency audio processing, critical for applications such as noise cancellation, voice communication, and speech recognition.

*[FFT]: Fast Fourier Transform

*[FIFO]: First In, First Out. A data buffer management technique that processes data in the order it was received. In AI model deployment, FIFOs can be used when reading layer data, which is particularly useful for larger models.

*[FPGA]: Field-Programmable Gate Array

*[GCC]: GNU Compiler Collection. A compiler system produced by the GNU Project supporting various programming languages.

*[GDB]: GNU Debugger. A portable debugger that runs on many Unix-like systems and works for many programming languages.

*[GNU]: GNU's Not Unix. A free software operating system.

*[GPIO]: General-Purpose Input/Output peripheral.

*[hardware acceleration]: Execution of supported model operations on dedicated hardware blocks instead of the CPU to improve performance or efficiency.

*[HALs]: Hardware Abstraction Layers. A conceptual interface between software and hardware that simplifies hardware access and improves portability.

*[HFSR]: HardFault Status Register. An ARM Cortex-M register that indicates why a fault escalated to a HardFault exception, such as a disabled configurable fault or a debug event.

*[I²C2]: Inter-Integrated Circuit peripheral instance (the “2” indicates the third I²C controller on the device).

*[IDE]: Integrated Development Environment. A software application that helps developers write and debug code.

*[IRQ]: Interrupt Request

*[Layer]: A structural unit in a machine learning model’s architecture that receives input from previous layers, applies a computation, and passes the result to subsequent layers.

*[Layerwise]: Analysis or optimization that is performed separately for each layer in a machine learning model.

*[MACs]: Multiply–accumulate counts. The total number of combined multiplication and addition operations required to execute a model or layer.

*[MCP]: Model Context Protocol. An open standard created by Anthropic that enables AI models to securely connect to external tools and data sources.

*[MCU]: Microcontroller Unit

*[MCUboot]: MCU Bootloader. An open-source bootloader for microcontrollers that supports verified and secure firmware updates.

*[memory pooling]: A memory management technique that reuses allocated memory buffers to reduce fragmentation and peak RAM usage.

*[ML]: Machine Learning

*[MMR]: Memory Mapped Register. A configuration register that is accessed as memory.

*[MMFAR]: MemManage Fault Address Register. An ARM Cortex-M register that contains the memory address that caused a MemManage fault, such as an MPU violation. Valid only when the MMARVALID bit in the CFSR is set.

*[MSDK]: Microcontroller Software Development Kit. A collection of software and tools used to develop firmware for Analog Devices' MAX32xxx and MAX78xxx microcontrollers.

*[NSS]: Neural Subsystem

*[Network configuration file]: A YAML file that describes the neural network architecture, layer parameters, and hardware mapping for PyTorch models deployed on the MAX78002 CNN accelerator. Required for the izer backend.

*[NVIC]: Nested Vectored Interrupt Controller

*[Oclif]: Open Command Line Interface Framework. A tool used to build your own command line interface (CLI).

*[OpenOCD]: Open On-Chip Debugger. A software that provides debugging and in-system programming for embedded target devices.

*[PSA]: Platform Security Architecture. An Arm-defined framework that standardizes trusted firmware, hardware isolation, and cryptographic service implementation in embedded systems.

*[pruning]: A model optimization technique that removes unnecessary weights or neurons from a neural network to reduce model size and computational requirements while maintaining accuracy.

*[PyTorch]: An open-source machine learning framework developed by Meta AI. In CodeFusion Studio, PyTorch models can be deployed on the MAX78002 CNN accelerator using the izer backend.

*[quantization]: A model optimization technique that reduces numerical precision (for example, from float32 to int8) to lower memory usage and computational cost, often with minimal impact on accuracy.

*[R]: Read-only access. Refers to the capability of a component to perform read-only operations.

*[R/W]: Read/Write access. Refers to the capability of a component to perform both reading and writing operations.

*[RISC-V]: Reduced Instruction Set Computer-5th generation. An open instruction set architecture (ISA) maintained by RISC-V International. In CodeFusion Studio, RISC-V refers to a RISC-V core, such as the one used as a secondary core in some MAX32xxx and MAX78xxx microcontrollers.

*[RoT]: Root of Trust. The foundational hardware or firmware component that serves as a secure starting point for a system’s security functions, such as secure boot or attestation.

*[RSS]: Real-time Subsystem

*[RTOS]: Real-Time Operating System

*[RX]: The receive signal of a UART peripheral.

*[SDK]: Software Development Kit

*[SigmaStudio+]: A graphical development tool from Analog Devices for configuring, tuning, and debugging DSP algorithms. 

*[softmax]: An activation function commonly used in the output layer of neural networks for multi-class classification. It converts raw model outputs into a probability distribution across multiple classes.

*[SoC]: System on Chip. A combination of processors and peripherals within a single chip.

*[sparsity]: A property of a model where many parameters are zero, enabling reduced memory usage, faster inference times, and lower energy consumption.

*[SVD]: System View Description. A file format used to describe the hardware of a microcontroller.

*[SWD]: Serial Wire Debug. A 2-pin debug interface from Arm. An alternative to JTAG.

*[TEF]: Trace Event Format. A JSON-based, timestamped trace data representation that can be converted from CTF.

*[tensor lifecycle optimization]: A memory optimization technique that reduces peak RAM usage by shortening the lifetime of intermediate tensors and reusing memory buffers during model execution.

*[TESA]: Trusted Edge Security Architecture. Analog Devices’ security framework that integrates cryptographic libraries, trusted firmware, and hardware-backed protection mechanisms within CodeFusion Studio.

*[TFLM]: TensorFlow Lite for Microcontrollers. A lightweight version of TensorFlow Lite designed to run machine learning models on DSPs, microcontrollers and other devices with limited memory.

*[TF-M]: Trusted Firmware-M. The open-source reference implementation of TrustZone services for Arm Cortex-M.

*[TX]: The transmit signal of a UART peripheral.

*[UART0]: Universal Asynchronous Receiver-Transmitter peripheral instance (the “0” indicates the first UART on the device).

*[UCL]: Universal Crypto Library.

*[USS]: Unified Security Software. ADI’s software security stack that provides APIs and services such as Secure Boot, Secure Storage, and Cryptographic Toolbox. USS forms the core software layer of TESA.

*[VS Code]: Visual Studio Code

*[VSIX]: Visual Studio extension file. A file format used to package and distribute Visual Studio Code extensions.
