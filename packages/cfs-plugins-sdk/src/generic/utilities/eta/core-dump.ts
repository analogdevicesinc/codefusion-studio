export default `<%
it.coreDump = function() {
  return "1234";
};

const CORE_DUMP_ADDRESSES = {
  'MAX32650': '0x102F0000',
  'MAX32655': '0x10060000',
  'MAX32657': '0x010E0000',
  'MAX32658': '0x010E0000',
  'MAX32660': '0x00030000',
  'MAX32662': '0x10030000',
  'MAX32666': '0x100F0000',
  'MAX32670': '0x10050000',
  'MAX32672': '0x100F0000',
  'MAX32675C': '0x10050000',
  'MAX32690': '0x102F0000',
  'MAX78000': '0x10070000',
  'MAX78002': '0x10270000'
};

it.coreDumpAddress = function(soc) {
  if (CORE_DUMP_ADDRESSES[soc]) {
    return CORE_DUMP_ADDRESSES[soc];
  }
  return '0x102F0000';
};
%>
`;
