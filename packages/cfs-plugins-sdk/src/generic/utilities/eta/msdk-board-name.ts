export default `<%
it.getMsdkBoardName = function() {
  switch (it.board.toLowerCase()) {
    case "evsys":
    case "evkit_v1":
      return "EvKit_V1";
    case "fthr":
      if (it.soc === "MAX32650") {
        return "FTHR_APPS_A";
      } else if (it.soc === "MAX32655") {
        return "FTHR_Apps_P1";
      } else if (it.soc === "MAX32675C") {
        return "FTHR_Apps_B";
      } else if (it.soc === "MAX78000") {
        return "FTHR_RevA";
      } else {
        return "FTHR";
      }
    case "ad-apard32690-sl":
    case "apard":
      return "APARD";
  }
  return it.board;
};
%>
`;
