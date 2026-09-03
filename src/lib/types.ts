export type CaseStatus = "new" | "drafted" | "review" | "filed";

export type Subject = {
  id: string;
  address: string;
  city: string;
  zip: string;
  parcel: string;
  assessedValue: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  lat: number;
  lng: number;
  status: CaseStatus;
  createdAt: string;
  seeded: boolean;
  factsAssumed?: boolean;
  owner?: string;
};

export type Comp = {
  id: string;
  address: string;
  city: string;
  zip: string;
  neighborhood: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  saleDate: string;
  salePrice: number;
  lat: number;
  lng: number;
  source: "demo-synthetic";
};

export type Adjustment = { label: string; amount: number };

export type AdjustedComp = Comp & {
  distanceMi: number;
  monthsAgo: number;
  pricePerSqft: number;
  adjustments: Adjustment[];
  netAdjustment: number;
  adjustedPrice: number;
  adjustedPricePerSqft: number;
  weight: number;
};

export type StepKey = "locate" | "comps" | "adjust" | "trend" | "grounds" | "letter";
export type StepStatus = "pending" | "running" | "done" | "error";

export type AgentStep = {
  key: StepKey;
  title: string;
  status: StepStatus;
  detail?: string;
  ms?: number;
};

export type TrendPoint = { month: string; medianPpsf: number };

export type Recommendation = "appeal" | "marginal" | "hold";

export type Analysis = {
  subject: Subject;
  comps: AdjustedComp[];
  excluded: AdjustedComp[];
  searchRadiusMi: number;
  neighborhoodPpsf: number;
  trend: TrendPoint[];
  trendPct: number;
  indicatedValue: number;
  indicatedPpsf: number;
  assessedPpsf: number;
  overAssessedBy: number;
  overAssessedPct: number;
  recommendation: Recommendation;
  grounds: string[];
  valuationDate: string;
  assessmentYear: number;
};

export type LetterModel = "deterministic" | "gemini-3.8-flash";

export type Draft = {
  caseId: string;
  letter: string;
  letterModel: LetterModel;
  generatedAt: string;
  editedAt?: string;
  inputHash?: string;
};

export type PlanId = "starter" | "team" | "firm";

export type Plan = {
  id: PlanId;
  name: string;
  seats: number;
  priceMonthly: number;
  blurb: string;
};

export type MemberRole = "owner" | "analyst" | "reviewer";
export type MemberStatus = "active" | "pending" | "inactive";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: string;
};

export type Org = {
  name: string;
  city: string;
  plan: PlanId;
  members: Member[];
};
