// ─── Phone Engine ─────────────────────────────────────────────────────────────
// International phone formatting and validation.
// Validation is intentionally lenient (length + digits only).
// For strict validation, integrate libphonenumber-js in a future sprint.

// Common phone prefixes — lookup by ISO 3166-1 alpha-2
export const PHONE_PREFIXES: Record<string, string> = {
  AR: '+54',  BR: '+55',  CL: '+56',  CO: '+57',  MX: '+52',  PE: '+51',
  VE: '+58',  EC: '+593', BO: '+591', PY: '+595', UY: '+598', GT: '+502',
  CR: '+506', PA: '+507', DO: '+1',   CU: '+53',  US: '+1',   CA: '+1',
  ES: '+34',  FR: '+33',  DE: '+49',  IT: '+39',  PT: '+351', GB: '+44',
  NL: '+31',  CH: '+41',  AT: '+43',  BE: '+32',  SE: '+46',  NO: '+47',
  DK: '+45',  PL: '+48',  TR: '+90',  AE: '+971', SA: '+966', QA: '+974',
  IL: '+972', EG: '+20',  JP: '+81',  CN: '+86',  KR: '+82',  AU: '+61',
  NZ: '+64',  SG: '+65',  IN: '+91',  TH: '+66',  ID: '+62',  HK: '+852',
  ZA: '+27',  NG: '+234', MA: '+212',
}

export interface PhonePrefix {
  country_code: string  // ISO 3166-1 alpha-2
  prefix:       string  // e.g. '+54'
  flag:         string  // emoji flag
  name:         string  // Country name
}

// Sorted list for UI select
export const PHONE_PREFIX_OPTIONS: PhonePrefix[] = [
  { country_code: 'AR', prefix: '+54',  flag: '🇦🇷', name: 'Argentina'           },
  { country_code: 'AU', prefix: '+61',  flag: '🇦🇺', name: 'Australia'           },
  { country_code: 'AT', prefix: '+43',  flag: '🇦🇹', name: 'Austria'             },
  { country_code: 'BE', prefix: '+32',  flag: '🇧🇪', name: 'Belgium'             },
  { country_code: 'BO', prefix: '+591', flag: '🇧🇴', name: 'Bolivia'             },
  { country_code: 'BR', prefix: '+55',  flag: '🇧🇷', name: 'Brasil'              },
  { country_code: 'CA', prefix: '+1',   flag: '🇨🇦', name: 'Canada'              },
  { country_code: 'CL', prefix: '+56',  flag: '🇨🇱', name: 'Chile'               },
  { country_code: 'CN', prefix: '+86',  flag: '🇨🇳', name: 'China'               },
  { country_code: 'CO', prefix: '+57',  flag: '🇨🇴', name: 'Colombia'            },
  { country_code: 'CR', prefix: '+506', flag: '🇨🇷', name: 'Costa Rica'          },
  { country_code: 'CU', prefix: '+53',  flag: '🇨🇺', name: 'Cuba'                },
  { country_code: 'DK', prefix: '+45',  flag: '🇩🇰', name: 'Denmark'             },
  { country_code: 'DO', prefix: '+1',   flag: '🇩🇴', name: 'Dominican Republic'  },
  { country_code: 'EC', prefix: '+593', flag: '🇪🇨', name: 'Ecuador'             },
  { country_code: 'EG', prefix: '+20',  flag: '🇪🇬', name: 'Egypt'               },
  { country_code: 'FR', prefix: '+33',  flag: '🇫🇷', name: 'France'              },
  { country_code: 'DE', prefix: '+49',  flag: '🇩🇪', name: 'Germany'             },
  { country_code: 'GT', prefix: '+502', flag: '🇬🇹', name: 'Guatemala'           },
  { country_code: 'HK', prefix: '+852', flag: '🇭🇰', name: 'Hong Kong'           },
  { country_code: 'IN', prefix: '+91',  flag: '🇮🇳', name: 'India'               },
  { country_code: 'ID', prefix: '+62',  flag: '🇮🇩', name: 'Indonesia'           },
  { country_code: 'IL', prefix: '+972', flag: '🇮🇱', name: 'Israel'              },
  { country_code: 'IT', prefix: '+39',  flag: '🇮🇹', name: 'Italy'               },
  { country_code: 'JP', prefix: '+81',  flag: '🇯🇵', name: 'Japan'               },
  { country_code: 'KR', prefix: '+82',  flag: '🇰🇷', name: 'South Korea'         },
  { country_code: 'MA', prefix: '+212', flag: '🇲🇦', name: 'Morocco'             },
  { country_code: 'MX', prefix: '+52',  flag: '🇲🇽', name: 'México'              },
  { country_code: 'NL', prefix: '+31',  flag: '🇳🇱', name: 'Netherlands'         },
  { country_code: 'NZ', prefix: '+64',  flag: '🇳🇿', name: 'New Zealand'         },
  { country_code: 'NG', prefix: '+234', flag: '🇳🇬', name: 'Nigeria'             },
  { country_code: 'NO', prefix: '+47',  flag: '🇳🇴', name: 'Norway'              },
  { country_code: 'PA', prefix: '+507', flag: '🇵🇦', name: 'Panama'              },
  { country_code: 'PY', prefix: '+595', flag: '🇵🇾', name: 'Paraguay'            },
  { country_code: 'PE', prefix: '+51',  flag: '🇵🇪', name: 'Perú'                },
  { country_code: 'PL', prefix: '+48',  flag: '🇵🇱', name: 'Poland'              },
  { country_code: 'PT', prefix: '+351', flag: '🇵🇹', name: 'Portugal'            },
  { country_code: 'QA', prefix: '+974', flag: '🇶🇦', name: 'Qatar'               },
  { country_code: 'SA', prefix: '+966', flag: '🇸🇦', name: 'Saudi Arabia'        },
  { country_code: 'SG', prefix: '+65',  flag: '🇸🇬', name: 'Singapore'           },
  { country_code: 'ZA', prefix: '+27',  flag: '🇿🇦', name: 'South Africa'        },
  { country_code: 'ES', prefix: '+34',  flag: '🇪🇸', name: 'Spain'               },
  { country_code: 'SE', prefix: '+46',  flag: '🇸🇪', name: 'Sweden'              },
  { country_code: 'CH', prefix: '+41',  flag: '🇨🇭', name: 'Switzerland'         },
  { country_code: 'TH', prefix: '+66',  flag: '🇹🇭', name: 'Thailand'            },
  { country_code: 'TR', prefix: '+90',  flag: '🇹🇷', name: 'Turkey'              },
  { country_code: 'AE', prefix: '+971', flag: '🇦🇪', name: 'UAE'                 },
  { country_code: 'GB', prefix: '+44',  flag: '🇬🇧', name: 'United Kingdom'      },
  { country_code: 'US', prefix: '+1',   flag: '🇺🇸', name: 'United States'       },
  { country_code: 'UY', prefix: '+598', flag: '🇺🇾', name: 'Uruguay'             },
  { country_code: 'VE', prefix: '+58',  flag: '🇻🇪', name: 'Venezuela'           },
]

/**
 * Get the phone prefix for a country code.
 * @example getPhonePrefix('AR') → '+54'
 */
export function getPhonePrefix(countryCode: string): string {
  return PHONE_PREFIXES[countryCode.toUpperCase()] ?? ''
}

/**
 * Ensure a phone number has the correct international prefix.
 * Does NOT reformat the local number — just prepends prefix if missing.
 */
export function normalizePhone(phone: string, countryCode: string): string {
  const raw = phone.trim()
  if (!raw) return raw
  const prefix = getPhonePrefix(countryCode)
  if (!prefix) return raw
  if (raw.startsWith('+')) return raw          // already international
  if (raw.startsWith('0')) return `${prefix}${raw.slice(1)}`
  return `${prefix}${raw}`
}

/**
 * Lenient phone validation: must have 6–15 digits (E.164 range).
 * Accepts spaces, dashes, dots, and parentheses as separators.
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-().+]/g, '')
  return /^\d{6,15}$/.test(digits)
}
