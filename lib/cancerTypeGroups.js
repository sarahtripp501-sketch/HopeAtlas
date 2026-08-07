// Standards-based hierarchy: 17 top-level buckets that most people recognize,
// each opening into real subtypes. This replaces the old flat/loose grouping
// with something closer to how OncoTree organizes cancer types — category
// first, specific subtype second.
//
// IMPORTANT: every string below is copied EXACTLY from the type strings
// already used to tag organizations in lib/orgData.js's ORGS array. This
// file only changes how types are *grouped and labeled* for display and
// search — it does not rename anything, so no org's tagging needs to change.

export const TYPE_GROUPS = [
  {
    label: "Breast",
    types: ["Breast"],
  },
  {
    label: "Lung",
    types: ["Lung"],
  },
  {
    label: "Brain / CNS",
    types: [
      "Brain",
      "Glioblastoma",
      "Meningioma",
      "Ependymoma",
      "Craniopharyngioma",
      "Medulloblastoma",
      "Pineal Tumors",
    ],
  },
  {
    label: "Colorectal",
    types: ["Colorectal"],
  },
  {
    label: "Prostate",
    types: ["Prostate"],
  },
  {
    label: "Blood / Leukemia",
    types: [
      "Blood (leukemia)",
      "Myeloma",
      "Acute Myeloid Leukemia (AML)",
      "Acute Lymphoblastic Leukemia (ALL)",
      "Chronic Myeloid Leukemia (CML)",
      "Chronic Lymphocytic Leukemia (CLL)",
      "Myelodysplastic Syndromes (MDS)",
      "Myeloproliferative Neoplasms (MPN)",
      "Essential Thrombocythemia",
      "Polycythemia Vera",
      "Primary Myelofibrosis",
      "Plasma Cell Disorders",
      "Hairy Cell Leukemia",
    ],
  },
  {
    label: "Lymphoma",
    types: [
      "Lymphoma",
      "Hodgkin Lymphoma",
      "Non-Hodgkin Lymphoma",
      "Follicular Lymphoma",
      "Mantle Cell Lymphoma",
      "Diffuse Large B-Cell Lymphoma (DLBCL)",
      "Burkitt Lymphoma",
      "Waldenström Macroglobulinemia",
      "Mycosis Fungoides / Cutaneous T-Cell Lymphoma",
    ],
  },
  {
    label: "Melanoma / Skin",
    types: [
      "Melanoma / skin",
      "Uveal Melanoma",
      "Merkel Cell Carcinoma",
      "Basal Cell Carcinoma",
      "Cutaneous Squamous Cell Carcinoma",
      "Squamous Cell Carcinoma",
    ],
  },
  {
    label: "Pancreatic",
    types: ["Pancreatic"],
  },
  {
    label: "Ovarian / Gynecologic",
    types: [
      "Ovarian / gynecologic",
      "Cervical",
      "Uterine",
      "Vulvar",
      "Vaginal Cancer",
      "Endometrial Cancer",
      "Fallopian Tube Cancer",
      "Primary Peritoneal Cancer",
      "Gestational Trophoblastic Disease (GTD)",
    ],
  },
  {
    label: "Kidney / Urinary",
    types: ["Kidney", "Bladder"],
  },
  {
    label: "Liver / Bile Duct",
    types: [
      "Liver",
      "Bile duct",
      "Gallbladder",
      "Cholangiocarcinoma",
      "Ampullary Cancer",
      "Hepatoblastoma",
    ],
  },
  {
    label: "Head & Neck",
    types: [
      "Head & neck",
      "Oral",
      "Thyroid",
      "Nasopharyngeal Cancer",
      "Oropharyngeal Cancer",
      "Laryngeal Cancer",
      "Hypopharyngeal Cancer",
      "Salivary Gland Cancer",
      "Nasal & Sinus Cancer",
      "Parathyroid Cancer",
    ],
  },
  {
    label: "Sarcoma / Bone",
    types: [
      "Sarcoma",
      "Bone Cancer",
      "Osteosarcoma",
      "Chondrosarcoma",
      "Ewing Sarcoma",
      "Rhabdomyosarcoma",
      "Leiomyosarcoma",
      "Liposarcoma",
      "Synovial Sarcoma",
      "Angiosarcoma",
      "Kaposi Sarcoma",
      "Fibrosarcoma",
      "Desmoid Tumor",
      "Chordoma",
    ],
  },
  {
    label: "Reproductive / Urologic",
    types: ["Testicular", "Penile"],
  },
  {
    label: "Stomach & Esophageal",
    types: ["Gastric / esophageal"],
  },
  {
    label: "Other / Rare",
    types: [
      "Other / rare",
      "Pediatric",
      "Adrenal",
      "Small intestine",
      "Appendix",
      "Mesothelioma",
      "Neuroendocrine tumor (NET)",
      "Gastrointestinal stromal tumor (GIST)",
      "Retinoblastoma",
      "Eye (Ocular) Cancer",
      "Duodenal Cancer",
      "Anal Cancer",
      "Cancer of Unknown Primary (CUP)",
      "Germ Cell Tumors",
      "Neuroblastoma",
      "Wilms Tumor",
      "Langerhans Cell Histiocytosis",
      "Histiocytosis",
      "Pheochromocytoma / Paraganglioma",
      "Pituitary Tumors",
      "Adrenocortical Carcinoma",
      "Thymoma / Thymic Carcinoma",
      "Pseudomyxoma Peritonei",
    ],
  },
];