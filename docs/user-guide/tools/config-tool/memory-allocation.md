---
description: Memory Allocation for CodeFusion Studio
author: Analog Devices
date: "2025-01-13"
---

# Memory Allocation

The Memory Allocation feature enables partitioning of internal and external SoC memory. Use this feature to create memory partitions and assign specific blocks of RAM or Flash to cores, ensuring that critical functions own the memory resources they need. This is ideal for multi-core applications, such as separating secure processes from general purpose tasks.

## Memory Allocation overview

![Memory Allocation Overview](./images/memory-allocation-overview-dark.png#only-dark) ![Memory Allocation Overview](./images/memory-allocation-overview-light.png#only-light)

1. **Filter options**: Filter memory blocks by type or core to locate partitions.
1. **Memory blocks list**: List of base memory blocks, derived from the devices datasheet.
1. **Create partition**: Click to define a new memory partition.
1. **User created partitions**: Lists created partitions.
1. **Memory allocation bars**: Visual representation of partition details, including size, assigned core, and memory address range.
1. **Partitions grouped by core**: Displays grouped by core, showing key details such as size, memory type, and range.
1. **Modify and delete partitions**: Click configure to edit a partition or click delete to remove it.

## Create a partition

!!! Note
    - Partitions must use a single block of memory. If you need multiple separate blocks, create them as individual partitions.
    - Partitions cannot overlap or extend into occupied memory. If the selected memory is already in use, an error message will appear. Modify or delete existing partitions to proceed.

Click **Create Partition** to define a new memory partition and enter the following details:

- **Memory Type**: The type of memory (e.g., RAM, FLASH).
- **Partition Name**: A unique name for the partition.
- **Assigned Cores**: The cores that will access the partition (e.g., ARM Cortex-M4). Multiple cores can be selected for a shared memory region.
- **Access Permissions**: Configure access permissions (for example: read, read/write) for each assigned core. If multiple cores are assigned, you can designate one of them as the owner. The owner core is responsible for initializing the memory. Other cores may access the memory but do not manage it.
- **Plugin Options**: Use these fields to pass additional configuration to the code generation plugin for the selected core. The available options depend on the firmware platform. For example, for a Zephyr-based core, you can enter `sram` or `flash` into the chosen field to assign a specific role (such as system SRAM or flash storage) to the memory region. Multiple values can be entered as a comma-separated list.
- **Base Block** (Optional): The base memory block (for example: System RAM Block 8). If left blank, this value is automatically determined based on the **Starting Address**.
- **Starting Address**: The starting address of the partition in hexadecimal format. If a **Base Block** is selected, this field updates accordingly.
- **Size**:  The partition size in KB, MB or bytes.

## Edit a partition

1. Locate the target core in the central view.
2. Expand the core card to view its assigned partitions.
3. Click configure ![Configure](./images/icon-config-dark.png#only-dark) ![Configure](./images/icon-config-light.png#only-light) to modify a partition.

## Delete a partition

1. Locate the target core in the central view.
2. Expand the core card to view its assigned partitions.
3. Click delete ![Delete](./images/icon-delete-dark.png#only-dark) ![Delete](./images/icon-delete-light.png#only-light) to remove a partition.
