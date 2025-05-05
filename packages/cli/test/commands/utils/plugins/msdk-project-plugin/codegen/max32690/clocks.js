/**
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

function addClockHeaders(hdrs) {
  if (getAssignedPeripheral("CM4 SysTick")?.Config?.ENABLE == "TRUE") {
    hdrs.add("core-cm4.h")
  }
  if (isClockAnySet("ADC")) {
    hdrs.add("adc.h")
  }
  if (isClockAnySet("I2C0/1/2") || isClockAnySet("I2C0/2")) {
    hdrs.add("i2c.h")
  }
  if (isClockAnySet("UART0/1/2") || isClockAnySet("LPUART0")) {
    hdrs.add("uart.h")
  }
  if (isClockAnySet("WDT0") || isClockAnySet("LPWDT0")) {
    hdrs.add("wdt.h")
  }
  if (isClockAnySet("High-Speed USB")) {
    hdrs.add("usb.h")
  }
  if (isClockAnySet("SPI0") || isClockAnySet("SPI0/1/2") || isClockAnySet("SPI3/4")) {
    hdrs.add("spi.h");
  }
  if (isClockAnySet("TMR0/1/2/3") || isClockAnySet("LPTMR0") || isClockAnySet("LPTMR1")) {
    hdrs.add("tmr.h")
  }
  if (isClockAnySet("ICC")) {
    hdrs.add("icc.h")
  }
  if (isClockAnySet("LPM Mux")) {
    hdrs.add("lp.h")
  }
  if (isClockAnySet("SQWOUT")) {
    hdrs.add("rtc.h")
  }
}
