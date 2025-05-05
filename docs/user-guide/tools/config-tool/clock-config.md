---
description: Clock Configuration Tool for CodeFusion Studio
author: Analog Devices
date: 2025-04-24
---

# Clock Configuration

The Clock Configuration feature allows you to configure and manage clock sources, dividers, and multiplexers to control the clock frequencies supplied to processor cores and peripherals. It ensures clock settings comply with hardware constraints and allows code generation to apply the desired configuration.

## Clock config diagram

This screen allows you configure the clock frequencies that are used by each of the peripherals and cores on the processor.
It includes error checking to ensure that the frequencies used are within the constraints of the processor specification.
After configuring your clock tree, you can generate code that will set the hardware to the desired configuration.

This visual representation of the clock tree is similar to that found in the processor user guide. The diagram contains nodes which represent the cores, peripherals, pins, multiplexers, and clock scalers present in the processor.
The frequencies used at each node are shown within the node.

![Clock Config](images/clock-config-dark.png#only-dark)
![Clock Config](images/clock-config-light.png#only-light)

### Navigation

Hover over the lines or nodes in the diagram to view frequency and other information. Nodes and lines on the diagram show as bold when enabled and faint when disabled.

The diagram can be zoomed in/out using the scroll wheel of your mouse or by using the zoom icons in the bottom right corner of the view. The fit to screen icon
![Fit To Screen](images/icon-fit-to-screen-dark.png#only-dark)
![Fit To Screen](images/icon-fit-to-screen-light.png#only-light)
 resizes the diagram to the size of your window.  

The diagram can be dragged within the window using the left or primary mouse button.

### Node types

In the left panel, the nodes from the diagram are listed, grouped by the type of the node:

* **Core** : A core on the processor.
* **Divider** : A frequency step-down scaler node.
* **Multiplier** : A frequency step-up scaler node
* **Mux** : A multiplexer that selects one of its inputs. In some cases, a mux can also direct a single input to one of its outputs.
* **Oscillator** : An internal oscillator present in the processor.
* **Peripheral** : A peripheral of the processor that is fed by one of the clocks. A peripheral can often be enabled or disabled.
* **Pin Input** : A pin that can be attached to an external oscillator. To use a pin input you need to assign it using the [Pin Config](./pin-config.md) tool.
* **Pin Output** : A pin that can send a clock out externally. To use a pin output you need to assign it using the [Pin Config](./pin-config.md) tool.

### Configuring clocks

Clicking on a node in the diagram or from the node list will show a view with the configuration options relevant to that node:

![Clock Config Node](images/clock-config-node-dark.png#only-dark)
![Clock Config Node](images/clock-config-node-light.png#only-light)

Changing any of the configuration options will be reflected in the diagram.  
Only valid options will be enabled by the tool.  

Clicking **back** will take you back to the list.  

!!! note
    Some clock settings, such as external input and output, require a corresponding pin to be configured in the [Pin Config](./pin-config.md) tool before it can be enabled.

### Errors

Errors that cause nodes to display in red and indicate an error that needs to be resolved:

* **A frequency out of range:** The error indicates whether the frequency is above or below the limits of operability of the peripheral.  

* **Unconfigured value:** This error indicates a required setting has not been specified:  

      * Unspecified frequency at a pin input  
      * Pin mux is not set to direct the clock signal to the peripheral  
