export default `<%~ include("@normalizeSoc", it) %>
<%
it.getZephyrBoardName = function() {
  const zephyrSoc = it.zephyrBoardNameInflectionPoint(it.soc).toLowerCase();
  switch (it.board.toLowerCase()) {
    case "ad-apard32690-sl":
      return 'apard32690/max32690/m4';
    case "evkit_v1":
      return \`\${zephyrSoc}evkit/\${zephyrSoc}\${
        zephyrSoc === 'max32666'
          ? '/cpu0'
          : ['max78000', 'max78002', 'max32690', 'max32655'].includes(zephyrSoc)
            ? '/m4'
            : ''
      }\`;
    case "fthr":
    case "fthr_reva":
      return \`\${zephyrSoc}fthr/\${zephyrSoc}\${
        zephyrSoc === 'max32666'
          ? '/cpu0'
          : ['max32672', 'max32650'].includes(zephyrSoc)
            ? ''
            : '/m4'
      }\`;
    case "fthr_apps_p1":
      return \`\${zephyrSoc}fthr_apps/\${zephyrSoc}/m4\`;
    case 'ad-swiot1l-sl':
      return 'ad_swiot1l_sl';
    case 'evsys':
      return \`\${zephyrSoc}evsys\`;
    default:
      throw new Error(\`Unsupported board: \${it.board}\`);
  }
};
%>
`;
