export default `<%
it.configureEnvVariables = function() {
  switch (it.coreId) {
    default:
      return JSON.stringify({});
  }
};
%>`;
