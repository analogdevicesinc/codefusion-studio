---
description: Pin Configuration Tool for CodeFusion Studio
author: Analog Devices
date: 2026-09-22
---

# Pin Config

The Pin Configuration tool allows you to graphically manipulate pin multiplexing and function selection within your processor, removing the tedious and error-prone elements of manual configuration. The tool flags conflicting configurations and displays the available pins and functions for each peripheral.  

## Pin Config overview

![Pin Config](images/pinmux-dark.png#only-dark)
![Pin Config](images/pinmux-light.png#only-light)

The Pin Config screen consists of several key components:

1. **Peripheral list**: View available peripherals. Click a peripheral to view associated signals.
1. **Filter options**: Use search bar and filters to locate specific pins or peripherals based on status.
1. **Pin Mux map**: View a visual representation of the pin multiplexing configuration.
1. **Assign pin**: Toggle ![Toggle](images/icon-toggle-dark.png#only-dark)
![Toggle](images/icon-toggle-light.png#only-light) a pin on or off to enable or disable pin assignment.
1. **Resolve conflicts**: Identify and correct conflicting pin assignments.
1. **Configure pin functions**: Click configure ![Configure](images/icon-config-dark.png#only-dark)
![Configure](images/icon-config-light.png#only-light) to open the configuration sidebar (7).
1. **Configuration sidebar**: View and modify the pin functions.

### Peripheral list

The left panel displays a list of available peripherals. Click the arrow next to the peripheral to expand it and view associated pins. When a peripheral is selected, all of the pins not associated with that peripheral are greyed out and unavailable for selection on the pin map.

### Filter options

Use the **Search** field to find any peripheral or pin by name or number. Non-matching entries will be hidden. Click **x** to reset the view.

Click the filter buttons to filter by:

- **Assigned** – Pins that are currently in use and allocated to a peripheral.
- **Available** – Pins that are free and can be assigned to a peripheral.
- **Conflicts** – Pins with multiple signals assigned, causing a conflict that must be resolved.

### Pin Mux map

The pin mux map displays the current multiplexing configuration. It updates dynamically as peripherals are configured and displays available, in-use, and conflicting pins.  

Hover over a pin to view a summary of its assigned function and available assignments. Nodes and lines on the diagram show as bold when enabled and faint when disabled.  

![Pin Mux](images/pinmux-dark-map.png#only-dark)
![Pin Mux](images/pinmux-light-map.png#only-light)

Zoom in or out of the diagram by scrolling with your mouse wheel or using the zoom icons in the bottom-right corner. Click the fit to screen icon
![Fit To Screen](images/icon-fit-to-screen-dark.png#only-dark)
![Fit To Screen](images/icon-fit-to-screen-light.png#only-light)
 to resize the diagram to fit your window.

The diagram can be dragged within the window using the left or primary mouse button.

### Assign pin

Each expanded peripheral lists signals with their signal name and pin designation.  
Toggle the pin to 'on'
![Toggle](images/icon-toggle-dark.png#only-dark)
![Toggle](images/icon-toggle-light.png#only-light)
to assign a signal to a pin. This enables the pin in the generated code and updates the map.

!!! note
    Fixed-function signals on peripherals such as DAI0 don't display a toggle because their pin assignment can't be changed.

### Resolve conflicts

Conflicts occur when multiple signals are configured to use the same pin and will cause operational errors.  
Conflicting signals appear as a red circle in the pin map. Hover over the pin to see which peripheral signals have been assigned.
A conflict is also indicated in the list of peripherals with a red X
![Conflict](images/icon-conflict-dark.png#only-dark)
![Conflict](images/icon-conflict-light.png#only-light)

To resolve a conflict, disable one of the functions associated with that pin.

!!! tip
    Use the **Conflicts** filter to quickly locate all conflicting pins.

### Configure pin functions

If the peripheral appears in [Peripheral Allocation](./peripheral-allocation.md), ensure it's allocated to a core before proceeding with configuration. For signals that support pin reassignment, also ensure the pin is [assigned](#assign-pin).

Select **Configure** ![Configure](images/icon-config-dark.png#only-dark)
![Configure](images/icon-config-light.png#only-light) to open the configuration sidebar and modify settings. The **Configure** icon only appears for signals that have applicable configuration options.

### Configuration sidebar

The configuration sidebar allows you to modify settings for a signal when it has applicable configuration options. If the peripheral appears in [Peripheral Allocation](./peripheral-allocation.md), these options are only available after the peripheral is allocated. For signals that support pin reassignment, they're also only available after the pin is assigned.

The fields shown in the sidebar vary depending on the selected signal type:

- GPIO signals provide all available configuration options, including the attached function and, in some environments, code generation metadata. The availability of these code generation fields depends on the selected firmware platform. Peripherals that allow assignment at the pin level, such as GPIO, also show a **Details** section with a **Description** field. Enter text in this field to document the purpose of the pin. The description is for reference only and doesn't affect code generation.
- Peripheral signals expose basic options such as pull-up/pull-down state and power supply. The behavior and code generation settings of supported peripherals can be configured in the [Peripheral Allocation](./peripheral-allocation.md) tool.

!!! note
    Use the **Reset to default** link to revert any changes.

![GPIO and UART sidebar comparison](images/pin-config-options-dark.png#only-dark)
![GPIO and UART sidebar comparison](images/pin-config-options-light.png#only-light)
