/**
 * Citizenship reference list (owner instruction 2026-11-20). The customer record
 * stores ISO 3166-1 alpha-2 codes; nationality and country names are display
 * labels. XK (Kosovo) is user-assigned, and the last two rows are legal statuses
 * rather than countries. A maintained reference list replaces this constant later.
 */
export type Citizenship = { code: string; nationality: string; country: string };

const ROWS: ReadonlyArray<readonly [string, string, string]> = [
  ["AF", "Afghan", "Afghanistan"], ["AL", "Albanian", "Albania"], ["DZ", "Algerian", "Algeria"], ["AD", "Andorran", "Andorra"],
  ["AO", "Angolan", "Angola"], ["AG", "Antiguan and Barbudan", "Antigua and Barbuda"], ["AR", "Argentinian", "Argentina"], ["AM", "Armenian", "Armenia"],
  ["AU", "Australian", "Australia"], ["AT", "Austrian", "Austria"], ["AZ", "Azerbaijani", "Azerbaijan"], ["BS", "Bahamian", "Bahamas"],
  ["BH", "Bahraini", "Bahrain"], ["BD", "Bangladeshi", "Bangladesh"], ["BB", "Barbadian", "Barbados"], ["BY", "Belarusian", "Belarus"],
  ["BE", "Belgian", "Belgium"], ["BZ", "Belizean", "Belize"], ["BJ", "Beninese", "Benin"], ["BT", "Bhutanese", "Bhutan"],
  ["BO", "Bolivian", "Bolivia"], ["BA", "Bosnian and Herzegovinian", "Bosnia and Herzegovina"], ["BW", "Botswanan", "Botswana"], ["BR", "Brazilian", "Brazil"],
  ["BN", "Bruneian", "Brunei"], ["BG", "Bulgarian", "Bulgaria"], ["BF", "Burkinabe", "Burkina Faso"], ["BI", "Burundian", "Burundi"],
  ["CV", "Cabo Verdean", "Cabo Verde"], ["KH", "Cambodian", "Cambodia"], ["CM", "Cameroonian", "Cameroon"], ["CA", "Canadian", "Canada"],
  ["CF", "Central African", "Central African Republic"], ["TD", "Chadian", "Chad"], ["CL", "Chilean", "Chile"], ["CN", "Chinese", "China"],
  ["CO", "Colombian", "Colombia"], ["KM", "Comorian", "Comoros"], ["CG", "Congolese (Republic of Congo)", "Republic of the Congo"], ["CR", "Costa Rican", "Costa Rica"],
  ["CI", "Ivorian", "Cote d'Ivoire"], ["HR", "Croatian", "Croatia"], ["CU", "Cuban", "Cuba"], ["CY", "Cypriot", "Cyprus"],
  ["CZ", "Czech", "Czechia"], ["CD", "Congolese (DR Congo)", "Democratic Republic of the Congo"], ["DK", "Danish", "Denmark"], ["DJ", "Djiboutian", "Djibouti"],
  ["DM", "Dominican (Dominica)", "Dominica"], ["DO", "Dominican (Dominican Republic)", "Dominican Republic"], ["EC", "Ecuadorian", "Ecuador"], ["EG", "Egyptian", "Egypt"],
  ["SV", "Salvadoran", "El Salvador"], ["GQ", "Equatoguinean", "Equatorial Guinea"], ["ER", "Eritrean", "Eritrea"], ["EE", "Estonian", "Estonia"],
  ["SZ", "Swazi", "Eswatini"], ["ET", "Ethiopian", "Ethiopia"], ["FJ", "Fijian", "Fiji"], ["FI", "Finnish", "Finland"],
  ["FR", "French", "France"], ["GA", "Gabonese", "Gabon"], ["GM", "Gambian", "Gambia"], ["GE", "Georgian", "Georgia"],
  ["DE", "German", "Germany"], ["GH", "Ghanaian", "Ghana"], ["GR", "Greek", "Greece"], ["GD", "Grenadian", "Grenada"],
  ["GT", "Guatemalan", "Guatemala"], ["GN", "Guinean", "Guinea"], ["GW", "Bissau-Guinean", "Guinea-Bissau"], ["GY", "Guyanese", "Guyana"],
  ["HT", "Haitian", "Haiti"], ["HN", "Honduran", "Honduras"], ["HU", "Hungarian", "Hungary"], ["IS", "Icelandic", "Iceland"],
  ["IN", "Indian", "India"], ["ID", "Indonesian", "Indonesia"], ["IR", "Iranian", "Iran"], ["IQ", "Iraqi", "Iraq"],
  ["IE", "Irish", "Ireland"], ["IL", "Israeli", "Israel"], ["IT", "Italian", "Italy"], ["JM", "Jamaican", "Jamaica"],
  ["JP", "Japanese", "Japan"], ["JO", "Jordanian", "Jordan"], ["KZ", "Kazakhstani", "Kazakhstan"], ["KE", "Kenyan", "Kenya"],
  ["KI", "I-Kiribati", "Kiribati"], ["KW", "Kuwaiti", "Kuwait"], ["KG", "Kyrgyzstani", "Kyrgyzstan"], ["LA", "Lao", "Laos"],
  ["LV", "Latvian", "Latvia"], ["LB", "Lebanese", "Lebanon"], ["LS", "Basotho", "Lesotho"], ["LR", "Liberian", "Liberia"],
  ["LY", "Libyan", "Libya"], ["LI", "Liechtensteiner", "Liechtenstein"], ["LT", "Lithuanian", "Lithuania"], ["LU", "Luxembourger", "Luxembourg"],
  ["MG", "Malagasy", "Madagascar"], ["MW", "Malawian", "Malawi"], ["MY", "Malaysian", "Malaysia"], ["MV", "Maldivian", "Maldives"],
  ["ML", "Malian", "Mali"], ["MT", "Maltese", "Malta"], ["MH", "Marshallese", "Marshall Islands"], ["MR", "Mauritanian", "Mauritania"],
  ["MU", "Mauritian", "Mauritius"], ["MX", "Mexican", "Mexico"], ["FM", "Micronesian", "Micronesia"], ["MD", "Moldovan", "Moldova"],
  ["MC", "Monegasque", "Monaco"], ["MN", "Mongolian", "Mongolia"], ["ME", "Montenegrin", "Montenegro"], ["MA", "Moroccan", "Morocco"],
  ["MZ", "Mozambican", "Mozambique"], ["MM", "Burmese", "Myanmar"], ["NA", "Namibian", "Namibia"], ["NR", "Nauruan", "Nauru"],
  ["NP", "Nepali", "Nepal"], ["NL", "Dutch", "Netherlands"], ["NZ", "New Zealander", "New Zealand"], ["NI", "Nicaraguan", "Nicaragua"],
  ["NE", "Nigerien", "Niger"], ["NG", "Nigerian", "Nigeria"], ["KP", "North Korean", "North Korea"], ["MK", "North Macedonian", "North Macedonia"],
  ["NO", "Norwegian", "Norway"], ["OM", "Omani", "Oman"], ["PK", "Pakistani", "Pakistan"], ["PW", "Palauan", "Palau"],
  ["PS", "Palestinian", "Palestine"], ["PA", "Panamanian", "Panama"], ["PG", "Papua New Guinean", "Papua New Guinea"], ["PY", "Paraguayan", "Paraguay"],
  ["PE", "Peruvian", "Peru"], ["PH", "Filipino", "Philippines"], ["PL", "Polish", "Poland"], ["PT", "Portuguese", "Portugal"],
  ["QA", "Qatari", "Qatar"], ["RO", "Romanian", "Romania"], ["RU", "Russian", "Russia"], ["RW", "Rwandan", "Rwanda"],
  ["KN", "Kittitian and Nevisian", "Saint Kitts and Nevis"], ["LC", "Saint Lucian", "Saint Lucia"], ["VC", "Vincentian", "Saint Vincent and the Grenadines"], ["WS", "Samoan", "Samoa"],
  ["SM", "Sammarinese", "San Marino"], ["ST", "Sao Tomean", "Sao Tome and Principe"], ["SA", "Saudi Arabian", "Saudi Arabia"], ["SN", "Senegalese", "Senegal"],
  ["RS", "Serbian", "Serbia"], ["SC", "Seychellois", "Seychelles"], ["SL", "Sierra Leonean", "Sierra Leone"], ["SG", "Singaporean", "Singapore"],
  ["SK", "Slovak", "Slovakia"], ["SI", "Slovenian", "Slovenia"], ["SB", "Solomon Islander", "Solomon Islands"], ["SO", "Somali", "Somalia"],
  ["ZA", "South African", "South Africa"], ["KR", "South Korean", "South Korea"], ["SS", "South Sudanese", "South Sudan"], ["ES", "Spanish", "Spain"],
  ["LK", "Sri Lankan", "Sri Lanka"], ["SD", "Sudanese", "Sudan"], ["SR", "Surinamese", "Suriname"], ["SE", "Swedish", "Sweden"],
  ["CH", "Swiss", "Switzerland"], ["SY", "Syrian", "Syria"], ["TJ", "Tajikistani", "Tajikistan"], ["TZ", "Tanzanian", "Tanzania"],
  ["TH", "Thai", "Thailand"], ["TL", "Timorese", "Timor-Leste"], ["TG", "Togolese", "Togo"], ["TO", "Tongan", "Tonga"],
  ["TT", "Trinidadian and Tobagonian", "Trinidad and Tobago"], ["TN", "Tunisian", "Tunisia"], ["TR", "Turkish", "Turkiye"], ["TM", "Turkmen", "Turkmenistan"],
  ["TV", "Tuvaluan", "Tuvalu"], ["UG", "Ugandan", "Uganda"], ["UA", "Ukrainian", "Ukraine"], ["AE", "Emirati", "United Arab Emirates"],
  ["GB", "British", "United Kingdom"], ["US", "American", "United States"], ["UY", "Uruguayan", "Uruguay"], ["UZ", "Uzbekistani", "Uzbekistan"],
  ["VU", "Ni-Vanuatu", "Vanuatu"], ["VA", "Vatican citizen", "Vatican City"], ["VE", "Venezuelan", "Venezuela"], ["VN", "Vietnamese", "Vietnam"],
  ["YE", "Yemeni", "Yemen"], ["ZM", "Zambian", "Zambia"], ["ZW", "Zimbabwean", "Zimbabwe"],
  // Additional jurisdictions and legal statuses the owner asked to consider.
  ["TW", "Taiwanese", "Taiwan"], ["XK", "Kosovar", "Kosovo"],
  ["STATELESS", "Stateless", "No citizenship"], ["OTHER", "Other / Not Listed", "Not listed"],
];

export const CITIZENSHIPS: readonly Citizenship[] = ROWS.map(([code, nationality, country]) => ({ code, nationality, country }));

const BY_CODE = new Map(CITIZENSHIPS.map((entry) => [entry.code, entry]));

export const CITIZENSHIP_OPTIONS = CITIZENSHIPS.map((entry) => ({
  value: entry.code,
  label: `${entry.nationality} (${entry.country})`,
}));

export function citizenshipByCode(code: string | null | undefined): Citizenship | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/** Printed nationality text for one or more codes, e.g. "Filipino; American". */
export function citizenshipLabels(codes: readonly string[] | null | undefined): string {
  return (codes ?? []).map((code) => BY_CODE.get(code)?.nationality ?? code).join("; ");
}

/** Accepts only known codes, so a stale or hand-typed value never reaches the record. */
export function validCitizenshipCodes(codes: readonly string[] | null | undefined): string[] {
  return [...new Set((codes ?? []).filter((code) => BY_CODE.has(code)))];
}
