export type College = {
  id: number;
  name: string;
  city: string;
  state: string;
  control: string;
  size: number;
  admissionRate: number | null;
  satAverage: number | null;
  actMidpoint: number | null;
  netPrice: number | null;
  tuitionIn: number | null;
  tuitionOut: number | null;
  website: string | null;
  calculator: string | null;
  programs: string[];
  programShares: Record<string, number>;
  family: string;
};
export type Geography =
  'any' | 'near-home' | 'in-state' | 'northeast' | 'south' | 'midwest' | 'west';
export type StudentProfile = {
  name: string;
  subject: string;
  homeState: string;
  geography: Geography;
  sat: number | null;
  act: number | null;
  gpa: number | null;
  needsAid: boolean;
  warmWeather: boolean;
  handsOn: boolean;
  size: 'any' | 'small' | 'medium' | 'large';
  schoolType: 'any' | 'public' | 'private';
  count: number;
};
export type ParsedProfile = { profile: StudentProfile; notices: string[] };
export type Band = 'Reach' | 'Target' | 'Safety' | 'Explore';
export type Evidence = { label: string; text: string; url: string };
export type Recommendation = {
  college: College;
  band: Band;
  score: number;
  reasons: string[];
  academicContext: string;
  considerations: string[];
  evidence: Evidence[];
};
export type RecommendationResult = {
  items: Recommendation[];
  eligibleCount: number;
  notices: string[];
};
export type Specialty = {
  subject?: string;
  handsOn?: boolean;
  label: string;
  text: string;
  url: string;
};
