export default `<%~ include("@normalizeSoc", it) %>

<%
it.processorMacro = function(soc) {
  return '__' + soc.replace(/-/g, '') + '__';
};

it.siliconRevision = function(soc) {
  return '0x0';
};

it.removeDash = function(soc) {
  return soc.replace(/-/g, '');
};
it.remove_W = function(soc) {
  return soc.replace(/W/g, '');
};

it.svdFile = function(soc) {
  switch (soc) {
    case "ADSP-21834":
    case "ADSP-21835":
      return "ADSP-2183x_LPC.svd";
    case "ADSP-21834W":
    case "ADSP-21835W":
      return "ADSP-2183xW_LPC.svd";
    case "ADSP-21836":
    case "ADSP-21837":
      return "ADSP-2183x_HPC.svd";
    case "ADSP-21836W":
    case "ADSP-21837W":
      return "ADSP-2183xW_HPC.svd";
    case "ADSP-SC834":
    case "ADSP-SC835":
      return "ADSP-SC83x_HPC.svd";
    case "ADSP-SC834W":
    case "ADSP-SC835W":
      return "ADSP-SC83xW_HPC.svd";
    default:
      throw new Error(\`Unsupported SoC: \${soc}\`);
  }
};

%>`;
