import type { Comp, Org, Plan, Subject } from "./types";

// All records below are synthetic demonstration data modelled loosely on
// King County, WA residential markets. They are not real sales, parcels,
// owners, or assessments.

export const ORG_NAME = "Northshore Appeals";
export const ORG_ADDRESS = ["123 Central Way, Suite 210", "Kirkland, WA 98033"];
export const ANALYST = { name: "Maya Lindqvist", title: "Senior Analyst" };

export const ASSESSMENT_YEAR = 2026;
export const VALUATION_DATE = "2026-01-01";
export const TODAY = "2026-09-03";

export const SUBJECTS: Subject[] = [
  {
    id: "juanita-132nd",
    address: "10416 NE 132nd Pl",
    city: "Kirkland",
    zip: "98034",
    parcel: "384720-0415",
    assessedValue: 1_486_000,
    beds: 4,
    baths: 2.5,
    sqft: 2310,
    lotSqft: 8400,
    yearBuilt: 1987,
    lat: 47.7195,
    lng: -122.2005,
    status: "new",
    createdAt: "2026-08-28T16:10:00Z",
    seeded: true,
    owner: "Owner of record",
  },
  {
    id: "houghton-108th",
    address: "6212 108th Ave NE",
    city: "Kirkland",
    zip: "98033",
    parcel: "339950-0120",
    assessedValue: 1_412_000,
    beds: 3,
    baths: 2,
    sqft: 1880,
    lotSqft: 7200,
    yearBuilt: 1962,
    lat: 47.6735,
    lng: -122.1975,
    status: "review",
    createdAt: "2026-08-21T18:40:00Z",
    seeded: true,
    owner: "Owner of record",
  },
  {
    id: "redmond-95th",
    address: "16520 NE 95th St",
    city: "Redmond",
    zip: "98052",
    parcel: "722560-0330",
    assessedValue: 1_598_000,
    beds: 4,
    baths: 3,
    sqft: 2640,
    lotSqft: 9100,
    yearBuilt: 1994,
    lat: 47.6925,
    lng: -122.121,
    status: "drafted",
    createdAt: "2026-08-14T21:05:00Z",
    seeded: true,
    owner: "Owner of record",
  },
];

export const COMPS: Comp[] = [
  { id: "c01", address: "12703 NE 116th Pl", city: "Kirkland", zip: "98034", neighborhood: "Juanita", beds: 4, baths: 2.5, sqft: 2240, lotSqft: 8100, yearBuilt: 1985, saleDate: "2026-05-14", salePrice: 1_265_000, lat: 47.7085, lng: -122.179, source: "demo-synthetic" },
  { id: "c02", address: "13217 100th Ave NE", city: "Kirkland", zip: "98034", neighborhood: "Juanita", beds: 4, baths: 2.25, sqft: 2410, lotSqft: 9300, yearBuilt: 1989, saleDate: "2026-03-02", salePrice: 1_318_000, lat: 47.7245, lng: -122.2035, source: "demo-synthetic" },
  { id: "c03", address: "10908 NE 137th St", city: "Kirkland", zip: "98034", neighborhood: "Juanita", beds: 3, baths: 2.5, sqft: 2105, lotSqft: 7600, yearBuilt: 1991, saleDate: "2026-06-21", salePrice: 1_199_000, lat: 47.7275, lng: -122.1945, source: "demo-synthetic" },
  { id: "c04", address: "9821 NE 124th St", city: "Kirkland", zip: "98034", neighborhood: "Juanita", beds: 4, baths: 3, sqft: 2560, lotSqft: 10200, yearBuilt: 1998, saleDate: "2025-11-08", salePrice: 1_410_000, lat: 47.7155, lng: -122.2115, source: "demo-synthetic" },
  { id: "c05", address: "11240 NE 140th St", city: "Kirkland", zip: "98034", neighborhood: "Kingsgate", beds: 3, baths: 2, sqft: 1940, lotSqft: 8800, yearBuilt: 1979, saleDate: "2026-01-27", salePrice: 1_085_000, lat: 47.73, lng: -122.19, source: "demo-synthetic" },
  { id: "c06", address: "7315 116th Ave NE", city: "Kirkland", zip: "98033", neighborhood: "Houghton", beds: 3, baths: 2, sqft: 1820, lotSqft: 7000, yearBuilt: 1964, saleDate: "2026-04-09", salePrice: 1_425_000, lat: 47.68, lng: -122.1855, source: "demo-synthetic" },
  { id: "c07", address: "5606 110th Ave NE", city: "Kirkland", zip: "98033", neighborhood: "Houghton", beds: 3, baths: 1.75, sqft: 1760, lotSqft: 7500, yearBuilt: 1959, saleDate: "2026-07-15", salePrice: 1_368_000, lat: 47.669, lng: -122.193, source: "demo-synthetic" },
  { id: "c08", address: "6910 112th Pl NE", city: "Kirkland", zip: "98033", neighborhood: "Houghton", beds: 4, baths: 2.5, sqft: 2180, lotSqft: 8000, yearBuilt: 1971, saleDate: "2025-12-03", salePrice: 1_610_000, lat: 47.679, lng: -122.19, source: "demo-synthetic" },
  { id: "c09", address: "9134 166th Ave NE", city: "Redmond", zip: "98052", neighborhood: "Education Hill", beds: 4, baths: 2.5, sqft: 2520, lotSqft: 9000, yearBuilt: 1992, saleDate: "2026-02-18", salePrice: 1_470_000, lat: 47.689, lng: -122.111, source: "demo-synthetic" },
  { id: "c10", address: "17021 NE 98th Way", city: "Redmond", zip: "98052", neighborhood: "Education Hill", beds: 4, baths: 3, sqft: 2780, lotSqft: 9600, yearBuilt: 1996, saleDate: "2026-05-30", salePrice: 1_560_000, lat: 47.6945, lng: -122.103, source: "demo-synthetic" },
  { id: "c11", address: "16215 NE 91st St", city: "Redmond", zip: "98052", neighborhood: "Education Hill", beds: 3, baths: 2.5, sqft: 2350, lotSqft: 8300, yearBuilt: 1990, saleDate: "2025-10-22", salePrice: 1_345_000, lat: 47.6875, lng: -122.117, source: "demo-synthetic" },
  { id: "c12", address: "12419 NE 108th St", city: "Kirkland", zip: "98033", neighborhood: "Rose Hill", beds: 3, baths: 2.25, sqft: 2010, lotSqft: 7900, yearBuilt: 1983, saleDate: "2026-08-04", salePrice: 1_245_000, lat: 47.7025, lng: -122.1795, source: "demo-synthetic" },
];

// Synthetic 12-month market index (median $/sqft relative to the first month).
// Months run from September 2025 through August 2026.
export const TREND_MONTHS = [
  "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
  "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08",
];
export const TREND_FACTORS = [1.0, 0.994, 0.988, 0.985, 0.99, 1.003, 1.012, 1.021, 1.028, 1.031, 1.029, 1.027];

export const PLANS: Plan[] = [
  { id: "starter", name: "Starter", seats: 3, priceMonthly: 99, blurb: "A principal and two analysts. Unlimited cases." },
  { id: "team", name: "Team", seats: 10, priceMonthly: 299, blurb: "A full desk with reviewer sign-off and shared templates." },
  { id: "firm", name: "Firm", seats: 25, priceMonthly: 799, blurb: "Multi-county desks, SSO, audit log, priority support." },
];

export const ORG: Org = {
  name: ORG_NAME,
  city: "Kirkland, WA",
  plan: "team",
  members: [
    { id: "m1", name: "Dana Okafor", email: "dana@northshoreappeals.example", role: "owner", status: "active", joinedAt: "2026-02-11" },
    { id: "m2", name: "Maya Lindqvist", email: "maya@northshoreappeals.example", role: "analyst", status: "active", joinedAt: "2026-02-18" },
    { id: "m3", name: "Teo Ramirez", email: "teo@northshoreappeals.example", role: "analyst", status: "active", joinedAt: "2026-03-04" },
    { id: "m4", name: "Priya Natarajan", email: "priya@northshoreappeals.example", role: "reviewer", status: "active", joinedAt: "2026-05-22" },
  ],
};
