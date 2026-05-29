export default `<%
it.getMsdkComponents = function(part) {
  let components = ["DMA", "FLC", "GPIO", "ICC", "LP", "SPI", "SYS", "TMR", "UART", "WDT"];

  switch (part.toLowerCase()) {
    case "max32650":
      components = [...components, "ADC", "CLCD", "EMCC", "HPB", "I2C", "OWM", "PT", "RTC", "SDHC", "SEMA", "SPIMSS", "SPIXF", "SPIXR", "SRCC", "TPU", "TRNG"];
      break;
    case "max32655":
      components = [...components, "ADC", "AES", "CRC", "I2C", "I2S", "LPCMP", "OWM", "PT", "RTC", "SEMA", "SIMO", "TRNG", "WUT"];
      break;
    case "max32657":
      components = [...components, "AES", "CRC", "I3C", "RTC", "TRNG", "TZ", "WUT"];
      break;
    case "max32660":
      components = [...components, "I2C", "RTC", "SPIMSS"];
      break;
    case "max32662":
      components = [...components, "ADC", "AES", "CAN", "I2C", "I2S", "PT", "RTC", "TRNG"];
      break;
    case "max32666":
      components = [...components, "ADC", "HTMR", "I2C", "OWM", "PT", "RPU", "RTC", "SDHC", "SEMA", "SIMO", "SPIXF", "SPIXR", "SRCC", "TPU", "TRNG", "WUT"];
      break;
    case "max32670":
      components = [...components, "AES", "CRC", "I2C", "I2S", "RTC", "TRNG"];
      break;
    case "max32672":
      components = [...components, "ADC", "AES", "CTB", "I2C", "I2S", "QDEC", "RTC", "TRNG"];
      break;
    case "max32675c":
      components = [...components, "AES", "AFE", "CRC", "I2C", "I2S", "TRNG"];
      break;
    case "max32690":
      components = [...components, "ADC", "CAN", "CTB", "EMCC", "HPB", "I2C", "I2S", "LPCMP", "OWM", "PT", "PUF", "RTC", "SEMA", "SPIXF", "SPIXR", "TRNG", "WUT"];
      break;
    case "max78000":
      components = [...components, "ADC", "AES", "CAMERAIF", "CRC", "I2C", "I2S", "LPCMP", "OWM", "PT", "RTC", "SEMA", "TRNG", "WUT"];
      break;
    case "max78002":
      components = [...components, "ADC", "AES", "CAMERAIF", "CRC", "CSI2", "I2C", "I2S", "LPCMP", "OWM", "PT", "RTC", "SDHC", "TRNG", "WUT"];
      break;
  }

  return components.sort();
};
%>
`;
