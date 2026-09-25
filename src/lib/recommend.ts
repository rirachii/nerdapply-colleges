import collegesData from '../data/colleges.json';
import { specialties } from '../data/specialties';
import {
  SUBJECTS,
  STATES,
  REGIONS,
  NEIGHBORS,
  WARM_STATES,
  money,
  scorecardUrl,
  subjectLabel,
} from './options';
import type { Band, College, Recommendation, RecommendationResult, StudentProfile } from './types';

export const colleges: College[] = collegesData;
export const BAND_DESCRIPTIONS: Record<Band, string> = {
  Reach:
    'The institution is highly selective, or your score is below its reported average. Keep ambition in the mix.',
  Target:
    'Your score is near or above the reported institutional comparator. Overall selectivity still matters; this is not a prediction.',
  Safety:
    'Your score is above the reported average and the overall admission rate is at least 65%. Admission is still uncertain.',
  Explore:
    'There is not enough comparable test data to estimate academic fit. Review the requirements together.',
};

export function admissionBand(c: College, p: StudentProfile): Band {
  // Never infer scores from "middling", a GPA, narrative, demographics, or missing data.
  if (p.sat === null && p.act === null) return 'Explore';
  if (c.admissionRate !== null && c.admissionRate < 0.25) return 'Reach';
  const difference =
    p.sat !== null && c.satAverage !== null
      ? (p.sat - c.satAverage) / 100
      : p.act !== null && c.actMidpoint !== null
        ? (p.act - c.actMidpoint) / 3
        : null;
  if (difference === null || c.admissionRate === null) return 'Explore';
  if (difference < -1) return 'Reach';
  if (difference >= 1 && c.admissionRate >= 0.65) return 'Safety';
  return 'Target';
}

export function recommend(
  p: StudentProfile,
  source: College[] = colleges,
  browseAll = false,
): RecommendationResult {
  const notices: string[] = [];
  const subject = SUBJECTS.find((s) => s.id === p.subject) ?? SUBJECTS[0];
  const allowedStates =
    p.geography === 'in-state'
      ? [p.homeState]
      : p.geography === 'near-home'
        ? [p.homeState, ...(NEIGHBORS[p.homeState] ?? [])]
        : REGIONS[p.geography];
  const eligible = source.filter((c) => {
    if (allowedStates && !allowedStates.includes(c.state)) return false;
    if (p.schoolType === 'public' && c.control !== 'Public') return false;
    if (p.schoolType === 'private' && c.control !== 'Private nonprofit') return false;
    if (p.subject === 'marine') return specialties[c.id]?.some((s) => s.subject === 'marine');
    return p.subject === 'any' || subject.codes.some((code) => c.programs.includes(code));
  });
  const scored: Recommendation[] = eligible
    .map((c) => {
      const facts = (specialties[c.id] ?? []).filter((s) => s.subject === p.subject || !s.subject);
      const band = admissionBand(c, p);
      const reasons: string[] = [];
      const considerations: string[] = [];
      let score = 0;
      if (p.subject !== 'any') {
        score += 40;
        // A modest signal of subject presence, not quality or prestige. Capped at 8 points.
        const share = Math.max(0, ...subject.codes.map((code) => c.programShares[code] ?? 0));
        score += Math.min(8, share * 40);
        if (facts.length) {
          reasons.push(facts[0].text);
          score += 8;
        } else
          reasons.push(
            `Reports degrees in the broad ${subjectLabel(p.subject).toLowerCase()} subject family. Confirm the exact major in its current catalog.`,
          );
      } else
        reasons.push(
          'An option for exploring undergraduate pathways. Discuss a potential major before narrowing your list.',
        );
      if (p.homeState && c.state === p.homeState) {
        score += 24;
        reasons.push(`Located in ${STATES[c.state]}, your selected home state.`);
      } else if (p.geography === 'near-home') {
        score += 12;
        reasons.push('Located in a neighboring state. Check the actual journey from home.');
      } else if (allowedStates) {
        score += 12;
        reasons.push(`Matches your selected ${p.geography} region.`);
      }
      if (p.warmWeather && WARM_STATES.includes(c.state)) {
        score += 12;
        reasons.push(
          'In a state included in the warm-weather preference. Check the local climate and seasonality.',
        );
      }
      if (p.handsOn) {
        if (facts.some((f) => f.handsOn)) {
          score += 25;
          reasons.push(
            'An official program page describes applied learning or research opportunities.',
          );
        } else
          considerations.push(
            'Ask about undergraduate projects, internships, co-ops, and access to hands-on learning.',
          );
      }
      if (p.size !== 'any') {
        const match =
          p.size === 'small'
            ? c.size < 5000
            : p.size === 'medium'
              ? c.size >= 5000 && c.size <= 15000
              : c.size > 15000;
        if (match) {
          score += 12;
          reasons.push(`Matches your ${p.size}-campus preference by undergraduate enrollment.`);
        } else
          considerations.push(
            `Campus size differs from your preference (${c.size.toLocaleString()} undergraduates).`,
          );
      }
      if (p.needsAid) {
        // Only a weak proxy: public averages apply to in-state cohorts, not out-of-state applicants.
        if (c.netPrice !== null && (c.control !== 'Public' || c.state === p.homeState))
          score += Math.max(0, 15 * (1 - c.netPrice / 50000));
        if (c.control === 'Public' && c.state === p.homeState) {
          score += 12;
          reasons.push(
            'Public, in your selected home state: investigate resident tuition and aid eligibility.',
          );
        }
        considerations.push(
          `Run the net price calculator with your family. ${c.netPrice === null ? 'Average net price is not reported.' : `The ${money(c.netPrice)} published average is not your aid offer.`}`,
        );
      }
      if (c.control === 'Public' && c.state !== p.homeState)
        considerations.push(
          'Out-of-state tuition and aid may differ substantially from the reported average net price.',
        );
      if (band === 'Reach')
        considerations.push(
          'Treat this as an ambitious option. Institution-wide figures can mask more selective majors.',
        );
      if (band === 'Explore')
        considerations.push(
          'Academic fit is unclassified because comparable scores or admission data are missing.',
        );
      considerations.push(
        'Verify current program entry requirements, deadlines, and testing policy on the college website.',
      );
      // Prefer comparable academic options without making selectivity or prestige a quality signal.
      if (band === 'Target') score += 10;
      if (band === 'Safety') score += 8;
      const evidence = facts.map((f) => ({ label: f.label, text: f.text, url: f.url }));
      evidence.push({
        label: 'College Scorecard',
        text: 'Institutional data from the June 2026 release; reporting years vary by field.',
        url: scorecardUrl(c.id),
      });
      const comparator =
        p.sat !== null && c.satAverage !== null
          ? `Student SAT ${p.sat}; reported college average ${c.satAverage}.`
          : p.act !== null && c.actMidpoint !== null
            ? `Student ACT ${p.act}; reported college midpoint ${c.actMidpoint}.`
            : 'No comparable student and college test score is available.';
      const academicContext = `${comparator} ${c.admissionRate === null ? 'Overall admission rate is not reported.' : `Overall admission rate: ${Math.round(c.admissionRate * 100)}%.`} This is not a personal admission probability.`;
      return { college: c, band, score, reasons, considerations, evidence, academicContext };
    })
    .sort((a, b) => b.score - a.score || a.college.name.localeCompare(b.college.name));
  // Discovery can browse every eligible school; family diversity is an initial-list rule.
  if (browseAll) return { items: scored, eligibleCount: eligible.length, notices: [] };
  const chosen: Recommendation[] = [];
  // One per available band, then strongest preference matches. Never fabricate balance.
  if (p.sat !== null || p.act !== null) {
    for (const band of ['Safety', 'Target', 'Reach'] as Band[]) {
      const candidate = scored.find(
        (r) =>
          r.band === band &&
          r.score >= (scored[0]?.score ?? 0) - 35 &&
          chosen.filter((selected) => selected.college.family === r.college.family).length < 2,
      );
      if (candidate) chosen.push(candidate);
    }
  }
  for (const candidate of scored) {
    if (chosen.length >= p.count) break;
    if (
      !chosen.some((r) => r.college.id === candidate.college.id) &&
      chosen.filter((r) => r.college.family === candidate.college.family).length < 2
    )
      chosen.push(candidate);
  }
  chosen.sort((a, b) => b.score - a.score || a.college.name.localeCompare(b.college.name));
  if (p.subject === 'marine')
    notices.push(
      'Marine biology uses six manually verified program pathways. This is a curated starting set, not a complete national search.',
    );
  if (chosen.length < p.count)
    notices.push(
      `Only ${chosen.length} colleges match this subject and geography. Broaden the region to see more; constraints were not silently relaxed.`,
    );
  if (p.geography === 'near-home')
    notices.push('Nearby means home and neighboring states, not a driving-distance guarantee.');
  if (p.needsAid)
    notices.push(
      'Cost is not a confirmed fit. Published net prices are historical cohort averages, not a personalized estimate or guaranteed financial safety.',
    );
  if (p.subject !== 'marine')
    notices.push(
      'Subject matches use broad degree families, not verified current major availability. Confirm the exact program.',
    );
  return { items: chosen, eligibleCount: eligible.length, notices };
}
