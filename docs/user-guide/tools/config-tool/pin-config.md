---
description: Pin Configuration Tool for CodeFusion Studio
author: Analog Devices
date: 2024-09-12
---

# Pin Configuration

The Pin Configuration tool allows you to graphically manipulate the pin muxing and function within your processor, removing the tedious and error prone elements from manual configuarion. The tool will flag up any conflicting configurations and show you the available pins and functions for any peripheral.  

The Pin Configuration consists of two screens within the Config Tool. For details on accessing the Config Tool and using the output see [Config Tool](./index.md).

## Pin Mux

The map of pins displays the current multiplexing configuration. This will update as peripherals are configured and will show which pins are available, in use or any conflicts.  

Hovering over a pin will provide a summary of what function the pin is and can be assigned to.  
![Pin Mux](images/pinmux-dark.png#only-dark)
![Pin Mux](images/pinmux-light.png#only-light)

### Navigation

Hover over a pin to view available signal information. Nodes and lines on the diagram show as bold when enabled and faint when disabled.  

The diagram can be zoomed in/out using the scroll wheel of your mouse or by using the zoom icons in the bottom right corner of the view. The fit to screen icon
![Fit To Screen](images/icon-fit-to-screen-dark.png#only-dark)
![Fit To Screen](images/icon-fit-to-screen-light.png#only-light)
 resizes the diagram to the size of your window.

The diagram can be dragged around the window using the left/primary mouse button or equivalent touchscreen gestures.

### Filtering

The Search field will allow you to find any peripheral or pin by name or number. Any non-matching entries will be hidden from view. To reset the view, click on the 'x' to the right of the search bar.  

### Peripherals

On the left of the view is a list of available peripherals. Expand a peripheral by clicking on the arrow on the left to see all of the pins associated with that peripheral. When any peripheral is selected, all of the pins not associated with that peripheral are hidden from the pin map.  

### Enable pins

Under the expanded peripheral is a list of signals containing the signal name and the pin designation.  
Toggle the pin to 'on'
![Toggle](images/icon-toggle-dark.png#only-dark)
![Toggle](images/icon-toggle-light.png#only-light)
to assign that signal to that pin. This enables the pin in the generated code and updates the map.  

When a pin is enabled, a configuration icon
![Configure](images/icon-config-dark.png#only-dark)
![Configure](images/icon-config-light.png#only-light)
becomes available. Click on the configuration icon to configure the functions associated with that pin.

### Conflicts

Conflicts occur when multiple signals are configured to use the same pin and will cause operational errors.  
Conflicting signals will be shown as red circle in the pin map, hover over that pin to see which peripheral signals have been assigned.  
A conflict is also shown in the signal list under a peripheral with a red X in a circle.
![Conflict](images/icon-conflict-dark.png#only-dark)
![Conflict](images/icon-conflict-light.png#only-light)

To resolve a conflict, disable one of the functions associated with that pin.

## Function Config

Displays a list of enabled signals and provides options to adjust the configuration of each.
Each option has a default value and can be adjusted with the drop-down menu of allowed options, or a free form text box.

![Pin Function](images/pin-function-dark.png#only-dark)
![Pin Function](images/pin-function-light.png#only-light)

Select the signal name to view the options available.

Examples of options:

* Input or output mode
* Power supply
* Pull-up/pull-down

On Zephyr projects, two additional fields are provided under function config:

* Device Tree identifier
* phandle identifier

!!! note
    Use the **Reset to default** link to revert any changes.
