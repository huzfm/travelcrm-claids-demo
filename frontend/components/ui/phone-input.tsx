'use client';

import * as React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';

type Country = { code: string; name: string; region: string; ccDigits: string };

const DEFAULT_COUNTRY_CODE = '+91';

const COUNTRIES: Country[] = [
  { code: '+91', name: 'India', region: 'IN' },
  { code: '+1', name: 'US / Canada', region: 'US' },
  { code: '+44', name: 'United Kingdom', region: 'GB' },
  { code: '+971', name: 'UAE', region: 'AE' },
  { code: '+966', name: 'Saudi Arabia', region: 'SA' },
  { code: '+974', name: 'Qatar', region: 'QA' },
  { code: '+973', name: 'Bahrain', region: 'BH' },
  { code: '+965', name: 'Kuwait', region: 'KW' },
  { code: '+968', name: 'Oman', region: 'OM' },
  { code: '+61', name: 'Australia', region: 'AU' },
  { code: '+65', name: 'Singapore', region: 'SG' },
  { code: '+60', name: 'Malaysia', region: 'MY' },
  { code: '+93', name: 'Afghanistan', region: 'AF' },
  { code: '+355', name: 'Albania', region: 'AL' },
  { code: '+213', name: 'Algeria', region: 'DZ' },
  { code: '+376', name: 'Andorra', region: 'AD' },
  { code: '+244', name: 'Angola', region: 'AO' },
  { code: '+54', name: 'Argentina', region: 'AR' },
  { code: '+374', name: 'Armenia', region: 'AM' },
  { code: '+43', name: 'Austria', region: 'AT' },
  { code: '+994', name: 'Azerbaijan', region: 'AZ' },
  { code: '+1242', name: 'Bahamas', region: 'BS' },
  { code: '+880', name: 'Bangladesh', region: 'BD' },
  { code: '+246', name: 'Barbados', region: 'BB' },
  { code: '+375', name: 'Belarus', region: 'BY' },
  { code: '+32', name: 'Belgium', region: 'BE' },
  { code: '+501', name: 'Belize', region: 'BZ' },
  { code: '+229', name: 'Benin', region: 'BJ' },
  { code: '+975', name: 'Bhutan', region: 'BT' },
  { code: '+591', name: 'Bolivia', region: 'BO' },
  { code: '+387', name: 'Bosnia & Herzegovina', region: 'BA' },
  { code: '+267', name: 'Botswana', region: 'BW' },
  { code: '+55', name: 'Brazil', region: 'BR' },
  { code: '+673', name: 'Brunei', region: 'BN' },
  { code: '+359', name: 'Bulgaria', region: 'BG' },
  { code: '+226', name: 'Burkina Faso', region: 'BF' },
  { code: '+257', name: 'Burundi', region: 'BI' },
  { code: '+855', name: 'Cambodia', region: 'KH' },
  { code: '+237', name: 'Cameroon', region: 'CM' },
  { code: '+238', name: 'Cape Verde', region: 'CV' },
  { code: '+236', name: 'Central African Republic', region: 'CF' },
  { code: '+235', name: 'Chad', region: 'TD' },
  { code: '+56', name: 'Chile', region: 'CL' },
  { code: '+86', name: 'China', region: 'CN' },
  { code: '+57', name: 'Colombia', region: 'CO' },
  { code: '+269', name: 'Comoros', region: 'KM' },
  { code: '+243', name: 'Congo (DRC)', region: 'CD' },
  { code: '+242', name: 'Congo Republic', region: 'CG' },
  { code: '+506', name: 'Costa Rica', region: 'CR' },
  { code: '+385', name: 'Croatia', region: 'HR' },
  { code: '+53', name: 'Cuba', region: 'CU' },
  { code: '+357', name: 'Cyprus', region: 'CY' },
  { code: '+420', name: 'Czech Republic', region: 'CZ' },
  { code: '+45', name: 'Denmark', region: 'DK' },
  { code: '+253', name: 'Djibouti', region: 'DJ' },
  { code: '+593', name: 'Ecuador', region: 'EC' },
  { code: '+20', name: 'Egypt', region: 'EG' },
  { code: '+503', name: 'El Salvador', region: 'SV' },
  { code: '+240', name: 'Equatorial Guinea', region: 'GQ' },
  { code: '+291', name: 'Eritrea', region: 'ER' },
  { code: '+372', name: 'Estonia', region: 'EE' },
  { code: '+268', name: 'Eswatini', region: 'SZ' },
  { code: '+251', name: 'Ethiopia', region: 'ET' },
  { code: '+679', name: 'Fiji', region: 'FJ' },
  { code: '+358', name: 'Finland', region: 'FI' },
  { code: '+33', name: 'France', region: 'FR' },
  { code: '+241', name: 'Gabon', region: 'GA' },
  { code: '+220', name: 'Gambia', region: 'GM' },
  { code: '+995', name: 'Georgia', region: 'GE' },
  { code: '+49', name: 'Germany', region: 'DE' },
  { code: '+233', name: 'Ghana', region: 'GH' },
  { code: '+30', name: 'Greece', region: 'GR' },
  { code: '+502', name: 'Guatemala', region: 'GT' },
  { code: '+224', name: 'Guinea', region: 'GN' },
  { code: '+245', name: 'Guinea-Bissau', region: 'GW' },
  { code: '+592', name: 'Guyana', region: 'GY' },
  { code: '+509', name: 'Haiti', region: 'HT' },
  { code: '+504', name: 'Honduras', region: 'HN' },
  { code: '+852', name: 'Hong Kong', region: 'HK' },
  { code: '+36', name: 'Hungary', region: 'HU' },
  { code: '+354', name: 'Iceland', region: 'IS' },
  { code: '+62', name: 'Indonesia', region: 'ID' },
  { code: '+98', name: 'Iran', region: 'IR' },
  { code: '+964', name: 'Iraq', region: 'IQ' },
  { code: '+353', name: 'Ireland', region: 'IE' },
  { code: '+972', name: 'Israel', region: 'IL' },
  { code: '+39', name: 'Italy', region: 'IT' },
  { code: '+225', name: 'Ivory Coast', region: 'CI' },
  { code: '+81', name: 'Japan', region: 'JP' },
  { code: '+962', name: 'Jordan', region: 'JO' },
  { code: '+7', name: 'Kazakhstan / Russia', region: 'KZ' },
  { code: '+254', name: 'Kenya', region: 'KE' },
  { code: '+82', name: 'South Korea', region: 'KR' },
  { code: '+383', name: 'Kosovo', region: 'XK' },
  { code: '+996', name: 'Kyrgyzstan', region: 'KG' },
  { code: '+856', name: 'Laos', region: 'LA' },
  { code: '+371', name: 'Latvia', region: 'LV' },
  { code: '+961', name: 'Lebanon', region: 'LB' },
  { code: '+266', name: 'Lesotho', region: 'LS' },
  { code: '+231', name: 'Liberia', region: 'LR' },
  { code: '+218', name: 'Libya', region: 'LY' },
  { code: '+423', name: 'Liechtenstein', region: 'LI' },
  { code: '+370', name: 'Lithuania', region: 'LT' },
  { code: '+352', name: 'Luxembourg', region: 'LU' },
  { code: '+853', name: 'Macau', region: 'MO' },
  { code: '+261', name: 'Madagascar', region: 'MG' },
  { code: '+265', name: 'Malawi', region: 'MW' },
  { code: '+960', name: 'Maldives', region: 'MV' },
  { code: '+223', name: 'Mali', region: 'ML' },
  { code: '+356', name: 'Malta', region: 'MT' },
  { code: '+222', name: 'Mauritania', region: 'MR' },
  { code: '+230', name: 'Mauritius', region: 'MU' },
  { code: '+52', name: 'Mexico', region: 'MX' },
  { code: '+373', name: 'Moldova', region: 'MD' },
  { code: '+377', name: 'Monaco', region: 'MC' },
  { code: '+976', name: 'Mongolia', region: 'MN' },
  { code: '+382', name: 'Montenegro', region: 'ME' },
  { code: '+212', name: 'Morocco', region: 'MA' },
  { code: '+258', name: 'Mozambique', region: 'MZ' },
  { code: '+95', name: 'Myanmar', region: 'MM' },
  { code: '+264', name: 'Namibia', region: 'NA' },
  { code: '+977', name: 'Nepal', region: 'NP' },
  { code: '+31', name: 'Netherlands', region: 'NL' },
  { code: '+64', name: 'New Zealand', region: 'NZ' },
  { code: '+505', name: 'Nicaragua', region: 'NI' },
  { code: '+227', name: 'Niger', region: 'NE' },
  { code: '+234', name: 'Nigeria', region: 'NG' },
  { code: '+389', name: 'North Macedonia', region: 'MK' },
  { code: '+47', name: 'Norway', region: 'NO' },
  { code: '+92', name: 'Pakistan', region: 'PK' },
  { code: '+970', name: 'Palestine', region: 'PS' },
  { code: '+507', name: 'Panama', region: 'PA' },
  { code: '+675', name: 'Papua New Guinea', region: 'PG' },
  { code: '+595', name: 'Paraguay', region: 'PY' },
  { code: '+51', name: 'Peru', region: 'PE' },
  { code: '+63', name: 'Philippines', region: 'PH' },
  { code: '+48', name: 'Poland', region: 'PL' },
  { code: '+351', name: 'Portugal', region: 'PT' },

  { code: '+40', name: 'Romania', region: 'RO' },

  { code: '+250', name: 'Rwanda', region: 'RW' },
  { code: '+685', name: 'Samoa', region: 'WS' },
  { code: '+378', name: 'San Marino', region: 'SM' },
  { code: '+239', name: 'São Tomé & Príncipe', region: 'ST' },
  { code: '+221', name: 'Senegal', region: 'SN' },
  { code: '+381', name: 'Serbia', region: 'RS' },
  { code: '+248', name: 'Seychelles', region: 'SC' },
  { code: '+232', name: 'Sierra Leone', region: 'SL' },
  { code: '+421', name: 'Slovakia', region: 'SK' },
  { code: '+386', name: 'Slovenia', region: 'SI' },
  { code: '+677', name: 'Solomon Islands', region: 'SB' },
  { code: '+252', name: 'Somalia', region: 'SO' },
  { code: '+27', name: 'South Africa', region: 'ZA' },
  { code: '+211', name: 'South Sudan', region: 'SS' },
  { code: '+34', name: 'Spain', region: 'ES' },
  { code: '+94', name: 'Sri Lanka', region: 'LK' },
  { code: '+249', name: 'Sudan', region: 'SD' },
  { code: '+597', name: 'Suriname', region: 'SR' },
  { code: '+46', name: 'Sweden', region: 'SE' },
  { code: '+41', name: 'Switzerland', region: 'CH' },
  { code: '+963', name: 'Syria', region: 'SY' },
  { code: '+886', name: 'Taiwan', region: 'TW' },
  { code: '+992', name: 'Tajikistan', region: 'TJ' },
  { code: '+255', name: 'Tanzania', region: 'TZ' },
  { code: '+66', name: 'Thailand', region: 'TH' },
  { code: '+670', name: 'Timor-Leste', region: 'TL' },
  { code: '+228', name: 'Togo', region: 'TG' },
  { code: '+676', name: 'Tonga', region: 'TO' },
  { code: '+216', name: 'Tunisia', region: 'TN' },
  { code: '+90', name: 'Turkey', region: 'TR' },
  { code: '+993', name: 'Turkmenistan', region: 'TM' },
  { code: '+256', name: 'Uganda', region: 'UG' },
  { code: '+380', name: 'Ukraine', region: 'UA' },
  { code: '+598', name: 'Uruguay', region: 'UY' },
  { code: '+998', name: 'Uzbekistan', region: 'UZ' },
  { code: '+678', name: 'Vanuatu', region: 'VU' },
  { code: '+58', name: 'Venezuela', region: 'VE' },
  { code: '+84', name: 'Vietnam', region: 'VN' },
  { code: '+967', name: 'Yemen', region: 'YE' },
  { code: '+260', name: 'Zambia', region: 'ZM' },
  { code: '+263', name: 'Zimbabwe', region: 'ZW' },
].map(c => ({ ...c, ccDigits: c.code.slice(1) }));

// Descending length so `+971` matches before `+97`.
const COUNTRIES_BY_LENGTH = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

/**
 * Match a country code against an input string. For inputs that arrive with
 * a leading `+` we require the prefix to match exactly. For digits-only
 * inputs (legacy rows in the DB) we match the country code against the
 * leading digits greedily so the rest is treated as the national number.
 */
function matchCountryCode(
  trimmed: string,
  digits: string,
  hasPlus: boolean
): { countryCode: string; nationalNumber: string } | null {
  for (const country of COUNTRIES_BY_LENGTH) {
    if (hasPlus) {
      if (trimmed.startsWith(country.code) && digits.length > country.ccDigits.length) {
        return {
          countryCode: country.code,
          nationalNumber: digits.slice(country.ccDigits.length),
        };
      }
    } else if (digits.startsWith(country.ccDigits) && digits.length > country.ccDigits.length) {
      return {
        countryCode: country.code,
        nationalNumber: digits.slice(country.ccDigits.length),
      };
    }
  }
  return null;
}

const EMPTY_PARSE = { countryCode: DEFAULT_COUNTRY_CODE, nationalNumber: '' };

/**
 * Splits a phone string into country code and national number. Accepts both
 * E.164 (`+91 98765 43210`) and legacy digits-only (`919876543210`) inputs.
 */
export function parseE164(value: string | null | undefined): {
  countryCode: string;
  nationalNumber: string;
} {
  if (value == null) return EMPTY_PARSE;
  const trimmed = String(value).trim();
  if (!trimmed) return EMPTY_PARSE;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return EMPTY_PARSE;

  const match = matchCountryCode(trimmed, digits, hasPlus);
  if (match) return match;

  // Unknown country code: keep the default prefix so the input isn't blank,
  // and show whatever digits we have as the national portion.
  return { countryCode: DEFAULT_COUNTRY_CODE, nationalNumber: hasPlus ? digits : '' };
}

/**
 * Formats a phone string for read-only display: `+91 98765 43210`. Falls
 * back to the raw value when the country code isn't recognized so users
 * with legacy / exotic rows still see their number.
 */
export function formatE164ForDisplay(value: string | null | undefined): string {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';

  const hasPlus = trimmed.startsWith('+');
  const match = matchCountryCode(trimmed, digits, hasPlus);
  if (!match) return trimmed;
  if (!match.nationalNumber) return match.countryCode;

  // Group national digits in pairs from the right.
  const groups: string[] = [];
  for (let i = match.nationalNumber.length; i > 0; i -= 2) {
    groups.unshift(match.nationalNumber.slice(Math.max(0, i - 2), i));
  }
  return `${match.countryCode} ${groups.join(' ')}`;
}

interface PhoneInputProps {
  // Controlled mode (plain React state, no RHF)
  value?: string;
  onChange?: (e164: string) => void;
  onBlur?: () => void;

  // RHF mode — if `name` is provided, the component wires Controller internally
  name?: string;
  control?: Control<FieldValues>;

  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  defaultCountry?: string;
  className?: string;
}

function PhoneInputBase({
  value,
  onChange,
  onBlur,
  error,
  required,
  disabled,
  id,
  placeholder = '9876543210',
  defaultCountry = '+91',
  className,
}: PhoneInputProps) {
  const initial = React.useMemo(
    () => parseE164(value) ?? { countryCode: defaultCountry, nationalNumber: '' },
    // Only run on mount; subsequent value updates flow through onChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [countryCode, setCountryCode] = React.useState<string>(
    initial.countryCode || defaultCountry
  );
  const [nationalNumber, setNationalNumber] = React.useState<string>(initial.nationalNumber);

  // Re-sync local state from the controlled `value` prop. The change-detection
  // guards keep us from clobbering an in-progress edit.
  React.useEffect(() => {
    if (value == null) return;
    const parsed = parseE164(value);

    if (parsed.countryCode && parsed.countryCode !== countryCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- parses the controlled E.164 value into its parts
      setCountryCode(parsed.countryCode);
    }

    if (value === '') {
      if (nationalNumber !== '') setNationalNumber('');
      return;
    }
    if (parsed.nationalNumber !== nationalNumber) {
      setNationalNumber(parsed.nationalNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = React.useCallback(
    (cc: string, nn: string) => {
      const digits = nn.replace(/\D/g, '').slice(0, 15);
      if (!digits) {
        onChange?.('');
        return;
      }
      onChange?.(`${cc}${digits}`);
    },
    [onChange]
  );

  const handleCountryChange = (next: string) => {
    setCountryCode(next);
    emit(next, nationalNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    setNationalNumber(digits);
    emit(countryCode, digits);
  };

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger
          aria-label="Country code"
          className={cn('w-[120px] shrink-0', error && 'border-destructive border-2')}
        >
          <SelectValue>
            {COUNTRIES.find(c => c.code === countryCode)
              ? `${COUNTRIES.find(c => c.code === countryCode)?.region} ${countryCode}`
              : countryCode}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map(c => (
            <SelectItem key={c.region} value={c.code}>
              {c.region} {c.code}
              <span className="ml-2 text-muted-foreground">{c.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={nationalNumber}
        onChange={handleNumberChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-label="Phone number"
        error={error}
        className="flex-1"
      />
    </div>
  );
}

export function PhoneInput(props: PhoneInputProps) {
  const { name, control, value: _value, onChange, onBlur, error, ...rest } = props;

  if (name && control) {
    return (
      <Controller
        control={control}
        name={name as Path<FieldValues>}
        render={({ field, fieldState }) => (
          <PhoneInputBase
            {...rest}
            value={field.value ?? ''}
            onChange={v => {
              field.onChange(v);
              onChange?.(v);
            }}
            onBlur={() => {
              field.onBlur();
              onBlur?.();
            }}
            error={error ?? fieldState.error?.message}
          />
        )}
      />
    );
  }

  return <PhoneInputBase {...props} />;
}
