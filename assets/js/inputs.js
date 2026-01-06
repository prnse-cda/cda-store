// inputs.js - central config for sheet and brand
(function(){
  window.CDA_INPUTS = {
    sheet_file_id: '2PACX-1vT9RM9PuEfM9qPbZXALjzYFdGEoBiltayHlPSQlY9yEurdsRIQK1fgTfE-Wofkd821fdqADQ6O08Z4x',
    collections_gid: '1398601849',
    // support both spellings
    insta_links_gid: '1810994710',
    insta_liks_gid: '1810994710',
    contacts_gid: '1117186654',
    brand_name: "Cathy's Dreamy Attire",
    // Cart constraints
    max_qty_per_item: 5,
    // Policy link opening mode: 'path' or 'overlay'
    policy_open_mode: 'path'
  };

  // Published CSV base for this Google Sheet (all sections)
  window.CDA_PUB_BASE = 'https://docs.google.com/spreadsheets/d/e/' + window.CDA_INPUTS.sheet_file_id + '/pub?single=true&output=csv&gid=';

  // Derived CSV config used by renderers; keep as gid tokens to leverage CDA_PUB_BASE
  var INP = window.CDA_INPUTS;
  window.CDA_CSV_CONFIG = {
    collections: INP.collections_gid,
    insta: (INP.insta_links_gid || INP.insta_liks_gid),
    footer: INP.contacts_gid
  };
})();
