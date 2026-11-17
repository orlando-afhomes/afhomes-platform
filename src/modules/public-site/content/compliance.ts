/** Compliance milestones for the Hotspring & Ecofarm Resort, copied from the old site (owner decision UI22). */
export type ComplianceMilestone = {
  phase: number;
  permit: string;
  agency: string;
  permitNo: string;
  start: string;
  completion: string;
  duration: string;
  status: "Completed";
};

export const COMPLIANCE_MILESTONES: ComplianceMilestone[] = [
  { phase: 1, permit: "Land Reclassification", agency: "LGU / Province", permitNo: "N.A.", start: "August 2024", completion: "March 2025", duration: "8 Months", status: "Completed" },
  { phase: 2, permit: "ECC", agency: "DENR-EMB", permitNo: "ECC-OL-R4A- 2025-430", start: "November 2024", completion: "July 2025", duration: "9 Months", status: "Completed" },
  { phase: 3, permit: "LLDA Clearance", agency: "LLDA", permitNo: "PC-25b-2025-00801", start: "July 2025", completion: "November 2025", duration: "5 Months", status: "Completed" },
  { phase: 4, permit: "EO 115 Compliance", agency: "LGU", permitNo: "N.A.", start: "March 2026", completion: "June 2026", duration: "3 Months", status: "Completed" },
  { phase: 5, permit: "SDP", agency: "LGU", permitNo: "002-2026", start: "April 2026", completion: "July 2026", duration: "3 Months", status: "Completed" },
];

export type CompliancePhase = { phase: number; title: string; subtitle: string; paragraphs: string[]; bullets?: string[] };

export const COMPLIANCE_INTRO =
  "AFhomes follows a strict, step-by-step compliance process with all Philippine regulatory agencies to ensure long-term sustainability and safety.";

export const COMPLIANCE_PHASES: CompliancePhase[] = [
  {
    phase: 1,
    title: "Land Reclassification (LGU / Province)",
    subtitle: "Foundation of Legal Land Use Compliance",
    paragraphs: [
      "This phase ensures that the project site is properly aligned with local and provincial land use plans. Through the Land Reclassification process, from agricultural to commercial land use, AFhomes secures approval from the Local Government Unit (LGU) and Provincial authorities, confirming that the land is legally designated for tourism and resort development.",
      "This step is critical in establishing a legitimate and compliant foundation for all future development activities.",
    ],
  },
  {
    phase: 2,
    title: "Environmental Compliance Certificate (ECC) – DENR-EMB",
    subtitle: "Environmental Protection and Sustainability Approval",
    paragraphs: [
      "The Environmental Compliance Certificate (ECC) is issued by the Department of Environment and Natural Resources (DENR-EMB). This phase evaluates the project's environmental impact and ensures that all development plans meet national environmental standards.",
      "AFhomes undergoes detailed environmental studies to guarantee that the project promotes sustainable tourism, ecological balance, and responsible land development.",
    ],
  },
  {
    phase: 3,
    title: "LLDA Clearance – Laguna Lake Development Authority",
    subtitle: "Water Resource and Ecosystem Protection",
    paragraphs: [
      "This phase ensures compliance with regulations set by the Laguna Lake Development Authority (LLDA), particularly for projects within the Laguna Lake watershed area.",
      "The clearance confirms that the project will not negatively impact water systems, drainage, and surrounding ecosystems, reinforcing AFhomes' commitment to water sustainability and environmental protection.",
    ],
  },
  {
    phase: 4,
    title: "Water Enhancement & Management System (EO 115 Compliance – LGU)",
    subtitle: "Local Environmental Policy Compliance",
    paragraphs: [
      "In compliance with Executive Order No. 115 (Series of 2025) issued by the Municipality of Calauan, this phase ensures the integration of water enhancement and management systems within the development. This includes implementing measures for:",
      "This step highlights AFhomes' alignment with local environmental policies and proactive sustainability initiatives.",
    ],
    bullets: ["Efficient water usage", "Drainage and runoff control", "Sustainable water resource management"],
  },
  {
    phase: 5,
    title: "Site Development Permit (SDP) – LGU",
    subtitle: "Final Approval for Construction and Development",
    paragraphs: [
      "The Site Development Permit (SDP) is the final regulatory approval required before construction begins. Issued by the LGU, this phase ensures that all prior compliance requirements have been successfully completed.",
      "Once approved, the project is authorized to proceed with site development, infrastructure construction, and operational preparations, ensuring full compliance with local building and safety regulations.",
    ],
  },
];

export const COMPLIANCE_DOCUMENTS_NOTE =
  "Relevant permits and compliance documents are available on this page for public reference. Additional supporting documents are available upon request and may be verified through a scheduled meeting with our Compliance Department.";

export const COMPLIANCE_RECOGNITION =
  "In line with its commitment to sustainable development, AFhomes Hotspring and Ecofarm Resort has been recognized by the Local Government Unit of Calauan, Laguna, through Resolution No. 11-151-2024, as a key contributor to local eco-tourism growth.";

export const COMPLIANCE_DOCUMENT_IMAGES = [
  { src: "/images/site/compliance/ecc-upscayl-3x-realesrgan-x4plus-scaled.webp", alt: "Environmental Compliance Certificate (ECC) from DENR-EMB", caption: "Environmental Compliance Certificate: ECC" },
  { src: "/images/site/compliance/llda-1024x522.webp", alt: "LLDA Clearance from the Laguna Lake Development Authority", caption: "Laguna Lake Development Authority: LLDA Clearance" },
];

/** Section copy and photos for the Compliance page (owner's reference design, 2026-11-17). */
export const COMPLIANCE_PAGE = {
  hero: {
    eyebrow: "AFhomes Hotspring & Ecofarm Resort",
    title: "Compliance",
    image: { src: "/images/site/resort/amenities-w-glamping-pool1.webp", alt: "The resort glamping pool" },
  },
  milestones: { eyebrow: "Compliance milestones", title: "Five permits, all completed" },
  journey: {
    eyebrow: "Our compliance journey",
    title: "Step-by-step regulatory milestones",
    text: "Ensuring 100% compliance with Philippine environmental, safety, and land-use regulations",
  },
  documents: { eyebrow: "Supporting documents", title: "Permits for public reference" },
  closing: {
    title: "Want to verify a document?",
    text: "Supporting documents can be verified through a scheduled meeting with our Compliance Department.",
    href: "/contact",
    cta: "Contact us",
    image: { src: "/images/site/resort/amenities-w-entrance1.webp", alt: "The resort entrance" },
  },
};
