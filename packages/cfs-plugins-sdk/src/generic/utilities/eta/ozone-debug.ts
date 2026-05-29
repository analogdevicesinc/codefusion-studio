/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

/**
 * Default SEGGER Ozone Project Template
 */

export default `<%
// Helper function to get core name based on SoC
function getCoreFileName(soc) {
  const socLower = soc.toLowerCase();
  if (["max32657", "max32658"].includes(socLower)) {
    return "m33";
  } else if (socLower === "max32666") {
    return "m4-0";
  } else {
    return "m4";
  }
}
%>/*********************************************************************
*                 (c) SEGGER Microcontroller GmbH                    *
*                      The Embedded Experts                          *
*                         www.segger.com                             *
**********************************************************************

File          : $(ProjectDir)/<%= getCoreFileName(it.soc) %>.jdebug
Created       : <%= new Date().toISOString().split("T")[0] %> 
Ozone Version : V3.34
*/

/*********************************************************************
*
*       OnProjectLoad
*
* Function description
*   Project load routine. Required.
*
**********************************************************************
*/
void OnProjectLoad (void) {
  //
  // Dialog-generated settings
  //
  Project.SetDevice ("<%= it.soc %>");
  Project.SetHostIF ("USB", "");
  Project.SetTargetIF ("SWD");
  Project.SetTIFSpeed ("4 MHz");
  //
  // User settings
  //
File.Open ("$(ProjectDir)/<%= (it.workspacePluginId && it.workspacePluginId.includes('zephyr')) || (it.pluginId && it.pluginId.includes('zephyr')) ? 'build/zephyr/zephyr.elf' : 'build/' + getCoreFileName(it.soc) + '.elf' %>");
}

/*********************************************************************
*
*       OnStartupComplete
*
* Function description
*   Called when program execution has reached/passed
*   the startup completion point. Optional.
*
**********************************************************************
*/
//void OnStartupComplete (void) {
//}

/*********************************************************************
*
*      TargetReset
*
* Function description
*   Replaces the default target device reset routine. Optional.
*
* Notes
*   This example demonstrates the usage when
*   debugging an application in RAM on a Cortex-M target device.
*
**********************************************************************
*/
//void TargetReset (void) {
//
//  unsigned int SP;
//  unsigned int PC;
//  unsigned int VectorTableAddr;
//
//  VectorTableAddr = Elf.GetBaseAddr();
//  //
//  // Set up initial stack pointer
//  //
//  if (VectorTableAddr != 0xFFFFFFFF) {
//    SP = Target.ReadU32(VectorTableAddr);
//    Target.SetReg("SP", SP);
//  }
//  //
//  // Set up entry point PC
//  //
//  PC = Elf.GetEntryPointPC();
//
//  if (PC != 0xFFFFFFFF) {
//    Target.SetReg("PC", PC);
//  } else if (VectorTableAddr != 0xFFFFFFFF) {
//    PC = Target.ReadU32(VectorTableAddr + 4);
//    Target.SetReg("PC", PC);
//  } else {
//    Util.Error("Project file error: failed to set entry point PC", 1);
//  }
//}

/*********************************************************************
*
*       BeforeTargetReset
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void BeforeTargetReset (void) {
//}

/*********************************************************************
*
*       AfterTargetReset
*
* Function description
*   Event handler routine. Optional.
*   The default implementation initializes SP and PC to reset values.
**
**********************************************************************
*/
void AfterTargetReset (void) {
  _SetupTarget();
}

/*********************************************************************
*
*       DebugStart
*
* Function description
*   Replaces the default debug session startup routine. Optional.
*
**********************************************************************
*/
//void DebugStart (void) {
//}

/*********************************************************************
*
*       TargetConnect
*
* Function description
*   Replaces the default target IF connection routine. Optional.
*
**********************************************************************
*/
//void TargetConnect (void) {
//}

/*********************************************************************
*
*       BeforeTargetConnect
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void BeforeTargetConnect (void) {
//}

/*********************************************************************
*
*       AfterTargetConnect
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void AfterTargetConnect (void) {
//}

/*********************************************************************
*
*       TargetDownload
*
* Function description
*   Replaces the default program download routine. Optional.
*
**********************************************************************
*/
//void TargetDownload (void) {
//}

/*********************************************************************
*
*       BeforeTargetDownload
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void BeforeTargetDownload (void) {
//}

/*********************************************************************
*
*      AfterTargetDownload
*
* Function description
*   Event handler routine. Optional.
*   The default implementation initializes SP and PC to reset values.
*
**********************************************************************
*/
void AfterTargetDownload (void) {
  _SetupTarget();
}

/*********************************************************************
*
*       BeforeTargetDisconnect
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void BeforeTargetDisconnect (void) {
//}

/*********************************************************************
*
*       AfterTargetDisconnect
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void AfterTargetDisconnect (void) {
//}

/*********************************************************************
*
*       AfterTargetHalt
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void AfterTargetHalt (void) {
//}

/*********************************************************************
*
*       BeforeTargetResume
*
* Function description
*   Event handler routine. Optional.
*
**********************************************************************
*/
//void BeforeTargetResume (void) {
//}

/*********************************************************************
*
*       OnSnapshotLoad
*
* Function description
*   Called upon loading a snapshot. Optional.
*
* Additional information
*   This function is used to restore the target state in cases
*   where values cannot simply be written to the target.
*   Typical use: GPIO clock needs to be enabled, before
*   GPIO is configured.
*
**********************************************************************
*/
//void OnSnapshotLoad (void) {
//}

/*********************************************************************
*
*       OnSnapshotSave
*
* Function description
*   Called upon saving a snapshot. Optional.
*
* Additional information
*   This function is usually used to save values of the target
*   state which can either not be trivially read,
*   or need to be restored in a specific way or order.
*   Typically use: Memory Mapped Registers,
*   such as PLL and GPIO configuration.
*
**********************************************************************
*/
//void OnSnapshotSave (void) {
//}

/*********************************************************************
*
*       OnError
*
* Function description
*   Called when an error ocurred. Optional.
*
**********************************************************************
*/
//void OnError (void) {
//}

/*********************************************************************
*
*       AfterProjectLoad
*
* Function description
*   After Project load routine. Optional.
*
**********************************************************************
*/
//void AfterProjectLoad (void) {
//}

/*********************************************************************
*
*       _SetupTarget
*
* Function description
*   Setup the target.
*   Called by AfterTargetReset() and AfterTargetDownload().
*
*   Auto-generated function. May be overridden by Ozone.
*
**********************************************************************
*/
void _SetupTarget(void) {
  unsigned int SP;
  unsigned int PC;
  unsigned int VectorTableAddr;

  VectorTableAddr = Elf.GetBaseAddr();
  //
  // Set up initial stack pointer
  //
  SP = Target.ReadU32(VectorTableAddr);
  if (SP != 0xFFFFFFFF) {
    Target.SetReg("SP", SP);
  }
  //
  // Set up entry point PC
  //
  PC = Elf.GetEntryPointPC();
  if (PC != 0xFFFFFFFF) {
    Target.SetReg("PC", PC);
  } else {
    Util.Error("Project script error: failed to set up entry point PC", 1);
  }
}

`;
