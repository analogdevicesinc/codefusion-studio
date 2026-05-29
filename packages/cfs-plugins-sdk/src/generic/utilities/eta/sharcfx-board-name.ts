export default `<%~ include("@normalizeSoc", it) %>
<%
it.getSharcFxBoardName = function() {
  const ezkit = new RegExp('adsp-?\\(sc|21\\)83.*ezkit');
  const som   = new RegExp('adsp-?\\(sc|21\\)83.*ev-som');

  if (ezkit.test(it.board.toLowerCase()))
      return 'ev_ezkit';

  if (som.test(it.board.toLowerCase()))
      return 'ev_som';

  return 'ev_som';
};
%>`;
