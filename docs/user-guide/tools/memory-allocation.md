---
description: Memory Allocation for CodeFusion Studio
author: Analog Devices
date: "2026-05-25"
---

# Memory Allocation

The Memory Allocation feature enables partitioning of internal and external SoC memory. Use this feature to create memory partitions and assign specific blocks of RAM or Flash to cores, ensuring that critical functions own the memory resources they need. This is ideal for multi-core applications, such as separating secure processes from general purpose tasks.

## Memory Allocation overview

![Memory Allocation Overview](./images/memory-allocation-overview-dark.png#only-dark) ![Memory Allocation Overview](./images/memory-allocation-overview-light.png#only-light)

1. **Filter options**: Filter memory blocks by type or core to locate partitions.
2. **Memory blocks list**: List of base memory blocks, derived from the devices datasheet. Expand a block to view details such as start or end addresses, minimum alignment, and usage.
3. **Memory allocation bar**: Visual overview of memory usage. Hover to view partition size, assigned core, and memory address range.
4. **Create partition**: Hover over a free region in the memory allocation bar, then click add (➕) to define a new memory partition. Alternatively, click **Create partition**.
5. **View by**: View partitions grouped by project or memory type.
6. **Modify and delete partitions**: Click configure to edit a partition or click delete to remove it.

## Create a partition

!!! Note
    Partitions cannot overlap or extend into occupied memory. If the selected memory is already in use, an error message will appear. Modify or delete existing partitions to proceed.

Hover over a free region in the memory bar, then click add (➕) to create a partition. Alternatively, you can click **Create Partition**.

!!! tip
    Using the interactive memory bar streamlines the setup process by automatically prepopulating fields, including core, memory type, starting address, and size.

The partition form includes the following fields:

- **Memory Type**: The type of memory (e.g., RAM, FLASH).
- **Partition Name**: A unique name for the partition.
- **Assigned Projects**: The projects that will access the partition. Multiple projects can be selected for a shared memory region.
- **Access Permissions**: Configure access permissions (for example: read, read/write) for each assigned project. If multiple projects are assigned, you can designate one of them as the owner. The owner project is responsible for initializing the memory. Other projects may access the memory but do not manage it.
- **Plugin Options**: Fields used to pass additional configurations to the code generation plugin for the selected project. The available options depend on the firmware platform. For example, in a Zephyr-based project, you can enter `sram` or `flash` into the chosen field to assign a specific role (such as system SRAM or flash storage) to the memory region. Multiple values can be entered as a comma-separated list.
- **Base Block** (Optional): The base memory block (for example: System RAM Block 8). If left blank, this value is automatically determined based on the **Starting Address**.
- **Starting Address**: The starting address of the partition in hexadecimal format. If a **Base Block** is selected, this field updates accordingly.
- **Size**:  The partition size in KB, MB or bytes.

## Edit a partition

To edit a partition, click the partition directly in the interactive memory bar.

Alternatively, you can:

1. Locate the target core or memory type in the central view.
2. Expand the partition card to view its assigned partitions.
3. Click configure ![Configure](./images/icon-config-dark.png#only-dark) ![Configure](./images/icon-config-light.png#only-light) to modify a partition.

## Delete a partition

To delete a partition, click the partition directly in the interactive memory bar, then click Delete ![Delete](./images/icon-delete-dark.png#only-dark) ![Delete](./images/icon-delete-light.png#only-light) at the top of the **Edit Partition** form.

Alternatively, you can:

1. Locate the target core or memory type in the central view.
2. Expand the partition card to view its assigned partitions.
3. Click delete ![Delete](./images/icon-delete-dark.png#only-dark) ![Delete](./images/icon-delete-light.png#only-light) to remove a partition.
