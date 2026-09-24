/**
 * BhashaFlow Hyper-Granular Portal Directory and Routing
 */

export const NATIONAL_PORTALS = [
  { portal_name: 'CPGRAMS (Central Grievance Portal)', portal_url: 'https://pgportal.gov.in', helpline: null },
  { portal_name: 'DARPG', portal_url: 'https://darpg.gov.in', helpline: null },
  { portal_name: 'PMO Grievance Portal', portal_url: 'https://www.pmindia.gov.in/en/status-of-public-grievances/', helpline: null },
  { portal_name: 'Directorate of Public Grievances (DPG)', portal_url: 'https://dpg.gov.in', helpline: null },
  { portal_name: 'India National Portal', portal_url: 'https://www.india.gov.in', helpline: null },
];

export const STATE_PORTALS = {
  Delhi: { portal_name: 'Delhi PGMS', portal_url: 'https://pgms.delhi.gov.in', helpline: '155345' },
  UP: { portal_name: 'Uttar Pradesh Jansunwai', portal_url: 'https://jansunwai.up.nic.in', helpline: '1076' },
  Maharashtra: { portal_name: 'Maharashtra Aaple Sarkar', portal_url: 'https://aaplesarkar.mahaonline.gov.in', helpline: '18001208040' },
  'Andhra Pradesh': { portal_name: 'Andhra Pradesh PGRS', portal_url: 'https://gramasachivalayam.ap.gov.in', helpline: '1902' },
};

export const DOMAIN_PORTALS = {
  // Law, Crime & Safety
  cybercrime: [
    { portal_name: 'National Cyber Crime Portal', portal_url: 'https://cybercrime.gov.in', helpline: '1930' }
  ],
  telecom_fraud: [
    { portal_name: 'Sanchar Saathi', portal_url: 'https://sancharsaathi.gov.in/sfc/', helpline: null }
  ],
  human_rights: [
    { portal_name: 'National Human Rights Commission', portal_url: 'https://nhrc.nic.in', helpline: '14433' }
  ],
  corruption: [
    { portal_name: 'Lokpal of India', portal_url: 'https://lokpal.gov.in', helpline: null }
  ],

  // Consumer & Financial
  consumer_rights: [
    { portal_name: 'National Consumer Helpline', portal_url: 'https://consumerhelpline.gov.in', helpline: '1915' },
    { portal_name: 'E-Daakhil', portal_url: 'https://edaakhil.nic.in', helpline: null }
  ],
  banking: [
    { portal_name: 'RBI Complaint Management', portal_url: 'https://cms.rbi.org.in', helpline: '14448' }
  ],
  stock_market: [
    { portal_name: 'SEBI SCORES', portal_url: 'https://scores.sebi.gov.in', helpline: '1800 266 7575' }
  ],
  insurance: [
    { portal_name: 'IRDAI Bima Bharosa', portal_url: 'https://bimabharosa.irdai.gov.in', helpline: '155255' }
  ],

  // Telecom & Internet
  telecom: [
    { portal_name: 'TRAI Consumer Portal', portal_url: 'https://www.trai.gov.in', helpline: null },
    { portal_name: 'TDSAT', portal_url: 'https://tdsat.gov.in', helpline: null }
  ],

  // Transport
  railways: [
    { portal_name: 'Rail Madad', portal_url: 'https://railmadad.indianrailways.gov.in', helpline: '139' }
  ],
  airlines: [
    { portal_name: 'AirSewa', portal_url: 'https://airsewa.gov.in', helpline: null }
  ],
  road_transport: [
    { portal_name: 'Parivahan', portal_url: 'https://parivahan.gov.in', helpline: null }
  ],

  // Real Estate
  real_estate: [
    { portal_name: 'RERA (Refer to State specific links)', portal_url: 'https://mohua.gov.in', helpline: null }
  ],

  // Municipal & Utilities
  sanitation: [
    { portal_name: 'Swachhata Platform', portal_url: 'https://swachhataapp.in', helpline: '1969' }
  ],
  electricity_water: [
    { portal_name: 'PG Portal (Utilities)', portal_url: 'https://pgportal.gov.in', helpline: '1906' }
  ],

  // Health & Food
  food_safety: [
    { portal_name: 'FSSAI Food Safety', portal_url: 'https://foscos.fssai.gov.in', helpline: '1800112100' }
  ],
  medicines: [
    { portal_name: 'CDSCO', portal_url: 'https://cdsco.gov.in', helpline: '1800111454' }
  ],
  health_schemes: [
    { portal_name: 'Ayushman Bharat', portal_url: 'https://pmjay.gov.in', helpline: '14555' }
  ],

  // Environment
  environment: [
    { portal_name: 'CPCB', portal_url: 'https://cpcb.nic.in', helpline: null }
  ],

  // Identity Services
  aadhaar: [
    { portal_name: 'UIDAI', portal_url: 'https://resident.uidai.gov.in/file-complaint', helpline: '1947' }
  ],
  passport: [
    { portal_name: 'Passport Seva', portal_url: 'https://passportindia.gov.in', helpline: '1800 258 1800' }
  ],
  income_tax: [
    { portal_name: 'Income Tax e-Nivaran', portal_url: 'https://eportal.incometax.gov.in', helpline: null }
  ],

  // Employment & Pension
  provident_fund: [
    { portal_name: 'EPFO Grievance', portal_url: 'https://epfigms.gov.in', helpline: '14470' }
  ],
  pensions: [
    { portal_name: 'Pension Portal', portal_url: 'https://pgportal.gov.in/pension', helpline: null }
  ],
  postal_services: [
    { portal_name: 'India Post', portal_url: 'https://www.indiapost.gov.in', helpline: '18002666868' }
  ],
  
  rti: [
    { portal_name: 'RTI Online', portal_url: 'https://rtionline.gov.in', helpline: null }
  ]
};

// State specific utility overrides
export const LEGACY_STATE_DATA = {
  electricity_water: {
    Delhi: {
      portal_name: 'Delhi Jal Board / BSES',
      portal_url: 'https://delhijalboard.delhi.gov.in',
      helpline: '1916',
      procedure_steps: ['Step 1: Visit Jal Board or BSES portal', 'Step 2: Enter CA Number', 'Step 3: Register complaint']
    },
    Maharashtra: {
      portal_name: 'MSEDCL / Maha Water',
      portal_url: 'https://www.mahadiscom.in',
      helpline: '1912',
      procedure_steps: ['Step 1: Visit MSEDCL portal', 'Step 2: Enter consumer number', 'Step 3: Register outage']
    }
  },
  sanitation: {
    Delhi: {
      portal_name: 'MCD',
      portal_url: 'https://mcdonline.nic.in',
      helpline: '155305',
      procedure_steps: ['Step 1: Contact MCD for local sanitation or stray animals', 'Step 2: Mention ward number']
    }
  }
};

// Expected resolution days per category
export const RESOLUTION_DAYS = {
  cybercrime: 3,
  telecom_fraud: 2,
  human_rights: 15,
  corruption: 30,
  consumer_rights: 20,
  banking: 15,
  stock_market: 21,
  insurance: 15,
  telecom: 7,
  railways: 2,
  airlines: 10,
  road_transport: 7,
  real_estate: 30,
  sanitation: 2,
  food_safety: 4,
  medicines: 4,
  health_schemes: 7,
  environment: 10,
  aadhaar: 14,
  passport: 14,
  income_tax: 21,
  provident_fund: 15,
  pensions: 15,
  postal_services: 10,
  rti: 30,
  electricity_water: 2,
  national_general: 15,
  state_general: 10,
  other: 10
};

export function getPortalsForCategory(category, state) {
  let portals = [];
  let procedureSteps = [];
  let expectedResolutionDays = RESOLUTION_DAYS[category] || 10;

  if (category === 'national_general') {
    portals = [...NATIONAL_PORTALS];
    procedureSteps = [
      'Step 1: Choose the appropriate national portal above.',
      'Step 2: Complete the registration process.',
      'Step 3: Keep your reference number safe for Tracking.'
    ];
  } else if (category === 'state_general') {
    if (state && STATE_PORTALS[state]) {
      portals.push(STATE_PORTALS[state]);
    }
    // Fallback if no specific state portal is found
    portals.push(NATIONAL_PORTALS[0]); // CPGRAMS
    procedureSteps = [
      'Step 1: Visit your state portal or the central CPGRAMS portal.',
      'Step 2: Submit local details and district.',
      'Step 3: Track the progress via SMS.'
    ];
  } else {
    // 1. Fetch domain-specific portals
    const domainSpecific = DOMAIN_PORTALS[category];
    if (domainSpecific) {
      portals = [...domainSpecific];
    }
    
    // 2. Fetch state-specific overrides if applicable
    if (LEGACY_STATE_DATA[category] && LEGACY_STATE_DATA[category][state]) {
      const stateSpecific = LEGACY_STATE_DATA[category][state];
      portals.unshift({ // Put state specific FIRST
        portal_name: stateSpecific.portal_name,
        portal_url: stateSpecific.portal_url,
        helpline: stateSpecific.helpline
      });
      procedureSteps = stateSpecific.procedure_steps;
    }

    // 3. Fallback
    if (portals.length === 0) {
      portals = [{ portal_name: 'CPGRAMS (Central Grievance Portal)', portal_url: 'https://pgportal.gov.in', helpline: null }];
    }

    if (procedureSteps.length === 0) {
      procedureSteps = [
        'Step 1: Navigate to the portal link provided.',
        'Step 2: Follow the agency instructions.',
        'Step 3: Ensure you provide your registered mobile number.'
      ];
    }
  }

  return { portalLinks: portals, procedureSteps, expectedResolutionDays };
}
