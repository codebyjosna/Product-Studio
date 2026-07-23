-- Auto-generated seed — countries + USD FX rates
-- Base currency: USD

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_alpha2 char(2) not null,
  code_alpha3 char(3) not null,
  currency_code char(3) not null,
  fx_rate numeric(24, 8) not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists countries_currency_alpha2_uidx
  on public.countries (currency_code, code_alpha2);

create index if not exists countries_currency_code_idx on public.countries (currency_code);
create index if not exists countries_name_idx on public.countries (name);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- App base pricing in USD
insert into public.app_settings (key, value, updated_at)
values (
  'base_pricing_usd',
  '{
    "base_currency": "USD",
    "plans": {
      "free": { "monthly": 0 },
      "starter": { "monthly": 3 },
      "pro": { "monthly": 10 },
      "enterprise": { "monthly": 50 }
    },
    "annual_multiplier": 10
  }'::jsonb,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

insert into public.app_settings (key, value, updated_at)
values (
  'fx_meta',
  '{
    "base_code": "USD",
    "provider": "exchangerate-api",
    "last_update_utc": "Thu, 23 Jul 2026 00:00:01 +0000"
  }'::jsonb,
  now()
)
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

alter table public.countries enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "countries_public_read" on public.countries;
create policy "countries_public_read"
  on public.countries for select
  to anon, authenticated
  using (true);

drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read"
  on public.app_settings for select
  to anon, authenticated
  using (true);

-- Seed / upsert countries
insert into public.countries (name, code_alpha2, code_alpha3, currency_code, fx_rate, updated_at, created_at)
values
  ('United States', 'US', 'USA', 'USD', 1, now(), now()),
  ('United Arab Emirates', 'AE', 'ARE', 'AED', 3.6725, now(), now()),
  ('Afghanistan', 'AF', 'AFG', 'AFN', 66.2088, now(), now()),
  ('Albania', 'AL', 'ALB', 'ALL', 82.0573, now(), now()),
  ('Armenia', 'AM', 'ARM', 'AMD', 366.3524, now(), now()),
  ('Curaçao', 'CW', 'CUW', 'ANG', 1.79, now(), now()),
  ('Angola', 'AO', 'AGO', 'AOA', 924.248, now(), now()),
  ('Argentina', 'AR', 'ARG', 'ARS', 1480.8616, now(), now()),
  ('Australia', 'AU', 'AUS', 'AUD', 1.4301, now(), now()),
  ('Aruba', 'AW', 'ABW', 'AWG', 1.79, now(), now()),
  ('Azerbaijan', 'AZ', 'AZE', 'AZN', 1.6998, now(), now()),
  ('Bosnia and Herzegovina', 'BA', 'BIH', 'BAM', 1.7141, now(), now()),
  ('Barbados', 'BB', 'BRB', 'BBD', 2, now(), now()),
  ('Bangladesh', 'BD', 'BGD', 'BDT', 123.4226, now(), now()),
  ('Bulgaria', 'BG', 'BGR', 'BGN', 1.7141, now(), now()),
  ('Bahrain', 'BH', 'BHR', 'BHD', 0.376, now(), now()),
  ('Burundi', 'BI', 'BDI', 'BIF', 2990.3365, now(), now()),
  ('Bermuda', 'BM', 'BMU', 'BMD', 1, now(), now()),
  ('Brunei', 'BN', 'BRN', 'BND', 1.2911, now(), now()),
  ('Bolivia', 'BO', 'BOL', 'BOB', 10.848, now(), now()),
  ('Brazil', 'BR', 'BRA', 'BRL', 5.068, now(), now()),
  ('Bahamas', 'BS', 'BHS', 'BSD', 1, now(), now()),
  ('Bhutan', 'BT', 'BTN', 'BTN', 96.6079, now(), now()),
  ('Botswana', 'BW', 'BWA', 'BWP', 13.8762, now(), now()),
  ('Belarus', 'BY', 'BLR', 'BYN', 2.8863, now(), now()),
  ('Belize', 'BZ', 'BLZ', 'BZD', 2, now(), now()),
  ('Canada', 'CA', 'CAN', 'CAD', 1.409, now(), now()),
  ('Democratic Republic of the Congo', 'CD', 'COD', 'CDF', 2287.3692, now(), now()),
  ('Switzerland', 'CH', 'CHE', 'CHF', 0.8138, now(), now()),
  ('Chile (UF)', 'CL', 'CHL', 'CLF', 0.02366, now(), now()),
  ('Chile', 'CL', 'CHL', 'CLP', 935.1834, now(), now()),
  ('China (offshore)', 'CN', 'CHN', 'CNH', 6.7738, now(), now()),
  ('China', 'CN', 'CHN', 'CNY', 6.7821, now(), now()),
  ('Colombia', 'CO', 'COL', 'COP', 3218.9368, now(), now()),
  ('Costa Rica', 'CR', 'CRI', 'CRC', 453.8244, now(), now()),
  ('Cuba', 'CU', 'CUB', 'CUP', 24, now(), now()),
  ('Cabo Verde', 'CV', 'CPV', 'CVE', 96.6343, now(), now()),
  ('Czech Republic', 'CZ', 'CZE', 'CZK', 21.182, now(), now()),
  ('Djibouti', 'DJ', 'DJI', 'DJF', 177.721, now(), now()),
  ('Denmark', 'DK', 'DNK', 'DKK', 6.5415, now(), now()),
  ('Dominican Republic', 'DO', 'DOM', 'DOP', 58.3206, now(), now()),
  ('Algeria', 'DZ', 'DZA', 'DZD', 133.1748, now(), now()),
  ('Egypt', 'EG', 'EGY', 'EGP', 51.3167, now(), now()),
  ('Eritrea', 'ER', 'ERI', 'ERN', 15, now(), now()),
  ('Ethiopia', 'ET', 'ETH', 'ETB', 160.474, now(), now()),
  ('Germany', 'DE', 'DEU', 'EUR', 0.8764, now(), now()),
  ('Fiji', 'FJ', 'FJI', 'FJD', 2.2408, now(), now()),
  ('Falkland Islands', 'FK', 'FLK', 'FKP', 0.7478, now(), now()),
  ('Faroe Islands', 'FO', 'FRO', 'FOK', 6.5417, now(), now()),
  ('United Kingdom', 'GB', 'GBR', 'GBP', 0.7477, now(), now()),
  ('Georgia', 'GE', 'GEO', 'GEL', 2.6256, now(), now()),
  ('Guernsey', 'GG', 'GGY', 'GGP', 0.7478, now(), now()),
  ('Ghana', 'GH', 'GHA', 'GHS', 11.6187, now(), now()),
  ('Gibraltar', 'GI', 'GIB', 'GIP', 0.7478, now(), now()),
  ('Gambia', 'GM', 'GMB', 'GMD', 74.4262, now(), now()),
  ('Guinea', 'GN', 'GIN', 'GNF', 8784.9383, now(), now()),
  ('Guatemala', 'GT', 'GTM', 'GTQ', 7.6287, now(), now()),
  ('Guyana', 'GY', 'GUY', 'GYD', 209.2678, now(), now()),
  ('Hong Kong', 'HK', 'HKG', 'HKD', 7.8399, now(), now()),
  ('Honduras', 'HN', 'HND', 'HNL', 26.7834, now(), now()),
  ('Croatia', 'HR', 'HRV', 'HRK', 6.6031, now(), now()),
  ('Haiti', 'HT', 'HTI', 'HTG', 130.794, now(), now()),
  ('Hungary', 'HU', 'HUN', 'HUF', 318.5978, now(), now()),
  ('Indonesia', 'ID', 'IDN', 'IDR', 17903.9955, now(), now()),
  ('Israel', 'IL', 'ISR', 'ILS', 3.0626, now(), now()),
  ('Isle of Man', 'IM', 'IMN', 'IMP', 0.7478, now(), now()),
  ('India', 'IN', 'IND', 'INR', 96.6138, now(), now()),
  ('Iraq', 'IQ', 'IRQ', 'IQD', 1310.1108, now(), now()),
  ('Iran', 'IR', 'IRN', 'IRR', 1296665.3422, now(), now()),
  ('Iceland', 'IS', 'ISL', 'ISK', 125.3992, now(), now()),
  ('Jersey', 'JE', 'JEY', 'JEP', 0.7478, now(), now()),
  ('Jamaica', 'JM', 'JAM', 'JMD', 158.6864, now(), now()),
  ('Jordan', 'JO', 'JOR', 'JOD', 0.709, now(), now()),
  ('Japan', 'JP', 'JPN', 'JPY', 163.0865, now(), now()),
  ('Kenya', 'KE', 'KEN', 'KES', 129.3132, now(), now()),
  ('Kyrgyzstan', 'KG', 'KGZ', 'KGS', 87.4372, now(), now()),
  ('Cambodia', 'KH', 'KHM', 'KHR', 4045.2681, now(), now()),
  ('Kiribati', 'KI', 'KIR', 'KID', 1.4301, now(), now()),
  ('Comoros', 'KM', 'COM', 'KMF', 431.1521, now(), now()),
  ('South Korea', 'KR', 'KOR', 'KRW', 1478.4931, now(), now()),
  ('Kuwait', 'KW', 'KWT', 'KWD', 0.3094, now(), now()),
  ('Cayman Islands', 'KY', 'CYM', 'KYD', 0.8333, now(), now()),
  ('Kazakhstan', 'KZ', 'KAZ', 'KZT', 467.5174, now(), now()),
  ('Laos', 'LA', 'LAO', 'LAK', 22468.2688, now(), now()),
  ('Lebanon', 'LB', 'LBN', 'LBP', 89500, now(), now()),
  ('Sri Lanka', 'LK', 'LKA', 'LKR', 336.2478, now(), now()),
  ('Liberia', 'LR', 'LBR', 'LRD', 180.9612, now(), now()),
  ('Lesotho', 'LS', 'LSO', 'LSL', 16.4169, now(), now()),
  ('Libya', 'LY', 'LBY', 'LYD', 6.4112, now(), now()),
  ('Morocco', 'MA', 'MAR', 'MAD', 9.3803, now(), now()),
  ('Moldova', 'MD', 'MDA', 'MDL', 17.5716, now(), now()),
  ('Madagascar', 'MG', 'MDG', 'MGA', 4288.0859, now(), now()),
  ('North Macedonia', 'MK', 'MKD', 'MKD', 53.9513, now(), now()),
  ('Myanmar', 'MM', 'MMR', 'MMK', 2098.3661, now(), now()),
  ('Mongolia', 'MN', 'MNG', 'MNT', 3598.2217, now(), now()),
  ('Macau', 'MO', 'MAC', 'MOP', 8.0757, now(), now()),
  ('Mauritania', 'MR', 'MRT', 'MRU', 40.1239, now(), now()),
  ('Mauritius', 'MU', 'MUS', 'MUR', 47.2598, now(), now()),
  ('Maldives', 'MV', 'MDV', 'MVR', 15.4525, now(), now()),
  ('Malawi', 'MW', 'MWI', 'MWK', 1741.1558, now(), now()),
  ('Mexico', 'MX', 'MEX', 'MXN', 17.408, now(), now()),
  ('Malaysia', 'MY', 'MYS', 'MYR', 4.087, now(), now()),
  ('Mozambique', 'MZ', 'MOZ', 'MZN', 63.6414, now(), now()),
  ('Namibia', 'NA', 'NAM', 'NAD', 16.4169, now(), now()),
  ('Nigeria', 'NG', 'NGA', 'NGN', 1372.6779, now(), now()),
  ('Nicaragua', 'NI', 'NIC', 'NIO', 36.8091, now(), now()),
  ('Norway', 'NO', 'NOR', 'NOK', 9.5975, now(), now()),
  ('Nepal', 'NP', 'NPL', 'NPR', 154.5727, now(), now()),
  ('New Zealand', 'NZ', 'NZL', 'NZD', 1.7197, now(), now()),
  ('Oman', 'OM', 'OMN', 'OMR', 0.3845, now(), now()),
  ('Panama', 'PA', 'PAN', 'PAB', 1, now(), now()),
  ('Peru', 'PE', 'PER', 'PEN', 3.4011, now(), now()),
  ('Papua New Guinea', 'PG', 'PNG', 'PGK', 4.4742, now(), now()),
  ('Philippines', 'PH', 'PHL', 'PHP', 61.821, now(), now()),
  ('Pakistan', 'PK', 'PAK', 'PKR', 277.6823, now(), now()),
  ('Poland', 'PL', 'POL', 'PLN', 3.7945, now(), now()),
  ('Paraguay', 'PY', 'PRY', 'PYG', 6060.6411, now(), now()),
  ('Qatar', 'QA', 'QAT', 'QAR', 3.64, now(), now()),
  ('Romania', 'RO', 'ROU', 'RON', 4.5922, now(), now()),
  ('Serbia', 'RS', 'SRB', 'RSD', 102.8681, now(), now()),
  ('Russia', 'RU', 'RUS', 'RUB', 78.5049, now(), now()),
  ('Rwanda', 'RW', 'RWA', 'RWF', 1472.7997, now(), now()),
  ('Saudi Arabia', 'SA', 'SAU', 'SAR', 3.75, now(), now()),
  ('Solomon Islands', 'SB', 'SLB', 'SBD', 8.0636, now(), now()),
  ('Seychelles', 'SC', 'SYC', 'SCR', 13.8171, now(), now()),
  ('Sudan', 'SD', 'SDN', 'SDG', 544.0671, now(), now()),
  ('Sweden', 'SE', 'SWE', 'SEK', 9.701, now(), now()),
  ('Singapore', 'SG', 'SGP', 'SGD', 1.2911, now(), now()),
  ('Saint Helena', 'SH', 'SHN', 'SHP', 0.7478, now(), now()),
  ('Sierra Leone', 'SL', 'SLE', 'SLE', 24.3641, now(), now()),
  ('Sierra Leone (old leone)', 'SL', 'SLE', 'SLL', 24364.1441, now(), now()),
  ('Somalia', 'SO', 'SOM', 'SOS', 571.4497, now(), now()),
  ('Suriname', 'SR', 'SUR', 'SRD', 37.8066, now(), now()),
  ('South Sudan', 'SS', 'SSD', 'SSP', 4877.6773, now(), now()),
  ('Sao Tome and Principe', 'ST', 'STP', 'STN', 21.4714, now(), now()),
  ('Syria', 'SY', 'SYR', 'SYP', 121.7944, now(), now()),
  ('Eswatini', 'SZ', 'SWZ', 'SZL', 16.4169, now(), now()),
  ('Thailand', 'TH', 'THA', 'THB', 33.7844, now(), now()),
  ('Tajikistan', 'TJ', 'TJK', 'TJS', 9.2413, now(), now()),
  ('Turkmenistan', 'TM', 'TKM', 'TMT', 3.5012, now(), now()),
  ('Tunisia', 'TN', 'TUN', 'TND', 2.9476, now(), now()),
  ('Tonga', 'TO', 'TON', 'TOP', 2.3861, now(), now()),
  ('Turkey', 'TR', 'TUR', 'TRY', 47.243, now(), now()),
  ('Trinidad and Tobago', 'TT', 'TTO', 'TTD', 6.779, now(), now()),
  ('Tuvalu', 'TV', 'TUV', 'TVD', 1.4301, now(), now()),
  ('Taiwan', 'TW', 'TWN', 'TWD', 32.4107, now(), now()),
  ('Tanzania', 'TZ', 'TZA', 'TZS', 2629.5124, now(), now()),
  ('Ukraine', 'UA', 'UKR', 'UAH', 44.7734, now(), now()),
  ('Uganda', 'UG', 'UGA', 'UGX', 3709.7572, now(), now()),
  ('Uruguay', 'UY', 'URY', 'UYU', 40.1719, now(), now()),
  ('Uzbekistan', 'UZ', 'UZB', 'UZS', 11991.5078, now(), now()),
  ('Venezuela', 'VE', 'VEN', 'VES', 737.8816, now(), now()),
  ('Vietnam', 'VN', 'VNM', 'VND', 26244.4515, now(), now()),
  ('Vanuatu', 'VU', 'VUT', 'VUV', 118.3525, now(), now()),
  ('Samoa', 'WS', 'WSM', 'WST', 2.7159, now(), now()),
  ('Cameroon', 'CM', 'CMR', 'XAF', 574.8694, now(), now()),
  ('Antigua and Barbuda', 'AG', 'ATG', 'XCD', 2.7, now(), now()),
  ('Caribbean Guilder region', 'CW', 'CUW', 'XCG', 1.79, now(), now()),
  ('IMF Special Drawing Rights', 'XD', 'XDR', 'XDR', 0.7363, now(), now()),
  ('Senegal', 'SN', 'SEN', 'XOF', 574.8694, now(), now()),
  ('French Polynesia', 'PF', 'PYF', 'XPF', 104.5805, now(), now()),
  ('Yemen', 'YE', 'YEM', 'YER', 238.3616, now(), now()),
  ('South Africa', 'ZA', 'ZAF', 'ZAR', 16.4149, now(), now()),
  ('Zambia', 'ZM', 'ZMB', 'ZMW', 18.3794, now(), now()),
  ('Zimbabwe (ZiG)', 'ZW', 'ZWE', 'ZWG', 26.6967, now(), now()),
  ('Zimbabwe', 'ZW', 'ZWE', 'ZWL', 26.6967, now(), now()),
  ('France', 'FR', 'FRA', 'EUR', 0.8764, now(), now()),
  ('Italy', 'IT', 'ITA', 'EUR', 0.8764, now(), now()),
  ('Spain', 'ES', 'ESP', 'EUR', 0.8764, now(), now()),
  ('Netherlands', 'NL', 'NLD', 'EUR', 0.8764, now(), now()),
  ('Ireland', 'IE', 'IRL', 'EUR', 0.8764, now(), now()),
  ('Belgium', 'BE', 'BEL', 'EUR', 0.8764, now(), now()),
  ('Austria', 'AT', 'AUT', 'EUR', 0.8764, now(), now()),
  ('Portugal', 'PT', 'PRT', 'EUR', 0.8764, now(), now()),
  ('Finland', 'FI', 'FIN', 'EUR', 0.8764, now(), now()),
  ('Greece', 'GR', 'GRC', 'EUR', 0.8764, now(), now())
on conflict (currency_code, code_alpha2) do update
  set name = excluded.name,
      code_alpha3 = excluded.code_alpha3,
      fx_rate = excluded.fx_rate,
      updated_at = now();

grant select on public.countries to anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant all on public.countries to service_role;
grant all on public.app_settings to service_role;
