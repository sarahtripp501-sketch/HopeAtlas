// Tailored to the exact wording used in Profile's diagnosis list (e.g.
// "Brain tumor - Glioblastoma", "Leukemia - Acute myeloid (AML)") — different
// formatting than the Resources page's list, so this is a separate map
// rather than reusing cancerTypeAliases.js directly.
//
// Each alias maps to one or more substrings to search for within the actual
// diagnosis list entries, rather than one exact target — this lets broader
// terms (like "skin cancer") surface multiple relevant entries at once.

export const DIAGNOSIS_ALIASES = {
  gbm: ["glioblastoma"],
  nsclc: ["non-small cell"],
  sclc: ["small cell"],
  tnbc: ["breast"],
  her2: ["breast"],
  cll: ["chronic lymphocytic"],
  aml: ["acute myeloid"],
  all: ["acute lymphoblastic"],
  cml: ["chronic myeloid"],
  mds: ["myelodysplastic"],
  mpn: ["myeloproliferative"],
  gist: ["gastrointestinal stromal"],
  net: ["neuroendocrine"],
  cup: ["unknown primary"],
  rcc: ["renal cell"],
  hcc: ["liver cancer"],
  acc: ["adrenal cortical"],
  bcc: ["basal cell"],
  scc: ["squamous cell"],
  dlbcl: ["non-hodgkin"],
  nhl: ["non-hodgkin"],
  hl: ["hodgkin"],
  "skin cancer": ["basal cell", "squamous cell", "melanoma"],
  "blood cancer": ["leukemia", "myeloma", "lymphoma"],
  "bone marrow cancer": ["leukemia", "myeloma", "myelodysplastic", "myeloproliferative"],
  "colon cancer": ["colorectal"],
  "bowel cancer": ["colorectal"],
  "rectal cancer": ["colorectal"],
  "throat cancer": ["laryngeal", "head and neck"],
  "womb cancer": ["endometrial"],
  "stomach cancer": ["gastric"],
};