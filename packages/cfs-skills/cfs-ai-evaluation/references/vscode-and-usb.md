# VS Code and native-USB capture routes

Read this only when the request names the VS Code UI or native USB capture.
The CLI/UART route in SKILL.md covers everything else.

## VS Code UART capture

1. Open `.cfs/ai.cfsaiprof` and wait for **Built**.
2. Select the probe and the serial port.
3. Press **Run**.
4. Once capture is listening, reset the board **once** to run the startup
   workload.
5. Press **Stop** after the bounded interval.

This UI order differs from CLI capture: the CLI opens the serial port *before*
executing the flash/run task, so startup inference is captured without a manual
reset. In the UI you attach first, then reset.

Verify the baud matches the project configuration. Use the general **Trace
Capture** configuration for custom serial settings. The AI Hardware Profiling
 view converts a valid trace to a Runtime Profile Report when you press Stop.
 CLI capture produces CTF/TEF; the evaluation workflow also generates
 `runtime.cfsreport` after capture.

Avoid repeated resets inside one capture: a new trace-start marker can replace
earlier raw data.

## Native USB capture

Use the VS Code **Trace Capture** panel. Neither `ai e2e --port` nor
`tasks run --capture --port` implements native USB capture.

Order matters:

1. Flash and start the firmware.
2. Select the enumerated USB device.
3. Attach capture.
4. Trigger the verified workload **without** resetting or reflashing.
5. Stop after the bounded interval.

Verify the USB peripheral, clock, a dedicated trace connection, and host/target
support from the selected target's current firmware configuration, capture plugin
and host capabilities. AI-enabled status alone does not establish native-USB
capture support; discover the supported route for the actual target and release.

### The startup-workload conflict

The stock AI profiling workload runs inference once at startup and then exits.
That is incompatible with native USB: resetting the board to re-run the workload
disconnects USB, so capture never sees an inference.

If no post-attachment workload exists, report hardware inference capture as
**blocked**, preserve the completed static and build results, and name the
supported UART alternative. Do not silently switch transport, and do not claim
that CPU or memory events prove inference occurred.

A USB-to-UART adapter is UART transport, not native USB.
