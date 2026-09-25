import { SUBJECTS, STATES, LIST_LENGTHS, DEFAULT_LIST_LENGTH } from './options';
import type { ParsedProfile, StudentProfile } from './types';

export const MAX_PROMPT_LENGTH = 4000;
const LIST_REQUEST =
  /\b(?:list of|shortlist of|looking for|wants?|needs?|give|show|find|recommend|include)\s+(?:(?:me|us)\s+)?(\d+)\s+(?:colleges?|schools?|universities|options)\b/i;

export function validatePrompt(text: string): string | null {
  const hasListRequest = LIST_LENGTHS.includes(Number(text.match(LIST_REQUEST)?.[1]));
  if (!hasListRequest && (text.trim().length < 20 || text.trim().split(/\s+/).length < 4))
    return 'Add a little more detail: an academic interest, location, or learning preference.';
  if (text.length > MAX_PROMPT_LENGTH)
    return `Keep the student description under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`;
  return null;
}

// Only extract recognizable signals; retain ambiguity for counselor review.
// This boundary can later be replaced by a schema-validated model adapter.
export function parseStudent(text: string): ParsedProfile {
  const notices: string[] = [];
  // Explicit labels can contain lowercase names. A bare heading requires title case.
  const explicitName = text.match(
    /(?:\bnamed\s+|\b(?:student(?:['’]s)?\s+)?name\s*(?:is|[:=])\s*|\bstudent\s*:\s*)([^\n,;:!?]+)/i,
  )?.[1];
  const nameWords = explicitName?.trim().split(/\s+/) ?? [];
  const stopName =
    /^(?:is|has|with|from|lives|loves|likes|wants|needs|interested|prefers|a|an|and|SAT|ACT|GPA)$/i;
  const keptName: string[] = [];
  for (const word of nameWords) {
    if (stopName.test(word) || !/^[\p{L}][\p{L}'’.-]*$/u.test(word) || keptName.length === 4) break;
    keptName.push(word);
    if (word.endsWith('.') && word.length > 2) break;
  }
  const headingName = text.match(
    /^\s*([\p{Lu}][\p{L}'’.-]+(?:[ \t]+[\p{Lu}][\p{L}'’.-]+){1,3})\s*(?:\n|[;,:]|[—–])/u,
  )?.[1];
  const name =
    keptName.join(' ').replace(/\.$/, '') ||
    (headingName &&
    !/^(?:Student|Quiet|Bright|Great|High|College|School|Home|Primary)\b/.test(headingName)
      ? headingName
      : '');
  if (!explicitName && name)
    notices.push('The opening name was used as the student name. Please confirm it.');

  const findScore = (label: string, min: number, max: number) => {
    const token = '[+-]?\\d(?:[\\d,]*\\d)?(?:\\.\\d+)?';
    const before = new RegExp(`(?<![\\w.,])(${token})\\s*(?:on\\s+(?:the\\s+)?)?${label}\\b`, 'gi');
    const after = new RegExp(
      `\\b${label}\\s*(?:score\\s*)?(?:of|is|was|:|=)?\\s*(${token})(?!\\w)`,
      'gi',
    );
    const tokens = [...text.matchAll(after)].map((m) => m[1]);
    for (const match of text.matchAll(before)) {
      // In "SAT 1320 ACT 29", 1320 belongs to SAT, not ACT.
      const prefix = text.slice(0, match.index);
      if (!/\b(?:SAT|ACT|GPA)\s*(?:score\s*)?(?:of|is|was|:|=)?\s*$/i.test(prefix))
        tokens.push(match[1]);
    }
    if (!tokens.length) return null;
    const values = tokens.map((raw) => Number(raw.replaceAll(',', '')));
    const valid = tokens.every((raw, i) => {
      const format =
        label === 'GPA' ? /^\d(?:\.\d{1,2})?$/.test(raw) : /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw);
      return format && values[i] >= min && values[i] <= max;
    });
    if (!valid) {
      notices.push(
        `${label} was outside the supported ${min}-${max} range or used an unsupported format and was left blank.`,
      );
      return null;
    }
    const unique = [...new Set(values)];
    if (unique.length > 1) {
      notices.push(
        `Several ${label} scores were provided. Choose the score to use; the field was left blank.`,
      );
      return null;
    }
    return unique[0];
  };
  const sat = findScore('SAT', 400, 1600);
  const act = findScore('ACT', 1, 36);
  const gpa = findScore('GPA', 0, 5);
  const mentionedSubjects = SUBJECTS.filter((s) => s.id !== 'any' && s.pattern.test(text));
  // Marine biology is more specific than general biology; don't mistake AP coursework for intended major.
  const interestText = text.match(
    /(?:interested in|major(?:ing)? in|wants? to study|primary interest\s*:|intended major\s*:)\s*([^.;\n]+)/i,
  )?.[1];
  const intended = interestText
    ? SUBJECTS.filter((s) => s.id !== 'any' && s.pattern.test(interestText))
    : [];
  const candidates = intended.length ? intended : mentionedSubjects;
  const primary = candidates.find((s) => s.id === 'marine') ?? candidates[0];
  let homeState = '';
  let explicitHome = false;
  for (const [code, full] of Object.entries(STATES)) {
    const homePattern = new RegExp(
      `\\b(?:from|lives? in|home (?:is )?in|based in|resident of|home state\\s*[:=]|state\\s*[:=])\\s*(?:${full}|${code})(?=[\\s,.;:!?]|$)`,
      'i',
    );
    if (homePattern.test(text)) {
      homeState = code;
      explicitHome = true;
      break;
    }
  }
  if (!homeState) {
    for (const [code, full] of Object.entries(STATES)) {
      if (new RegExp(`\\b${full}\\b`, 'i').test(text) || new RegExp(`\\b${code}\\b`).test(text)) {
        homeState = code;
        break;
      }
    }
  }
  let geography: StudentProfile['geography'] = 'any';
  if (/in[- ]state|home state only/i.test(text)) geography = 'in-state';
  else if (
    /close to home|near home|nearby|not too far|aren.t too far|stay local|close by/i.test(text)
  )
    geography = 'near-home';
  else if (/northeast|new england/i.test(text)) geography = 'northeast';
  else if (/midwest/i.test(text)) geography = 'midwest';
  else if (/(?:in|the|prefer\w*)\s+(?:the\s+)?west(?:ern)?\b|west coast/i.test(text))
    geography = 'west';
  else if (/(?:in|the|prefer\w*)\s+(?:the\s+)?south(?:ern)?\b|southeast/i.test(text))
    geography = 'south';
  const hasPositive = (pattern: RegExp) => {
    // Negation is clause-local; one excluded priority must not cancel a different positive one.
    return text.split(/[.;\n]|\bbut\b/i).some((clause) => {
      const match = clause.match(pattern);
      if (!match) return false;
      const prefix = clause.slice(0, match.index);
      return !/\b(?:no|not|doesn['’]t|don['’]t|avoid|without)\b[^,;]*$/i.test(prefix);
    });
  };
  const publicOnly = hasPositive(
    /\b(?:public[- ]only|public\s+(?:only|colleges?|schools?|universit\w*))/i,
  );
  const privateOnly = hasPositive(
    /\b(?:private[- ]only|private\s+(?:only|colleges?|schools?|universit\w*))/i,
  );
  const eitherType =
    /\b(?:public\s*(?:or|and|&)\s*private|private\s*(?:or|and|&)\s*public)\b/i.test(text);
  const avoidPrivate =
    /\b(?:avoid|no|not|doesn['’]t want|does not want)\s+(?:any\s+)?private\s+(?:colleges?|schools?|universit\w*)/i.test(
      text,
    );
  const avoidPublic =
    /\b(?:avoid|no|not|doesn['’]t want|does not want)\s+(?:any\s+)?public\s+(?:colleges?|schools?|universit\w*)/i.test(
      text,
    );
  let schoolType: StudentProfile['schoolType'] = 'any';
  if (!eitherType && (publicOnly || avoidPrivate) && !(privateOnly || avoidPublic))
    schoolType = 'public';
  if (!eitherType && (privateOnly || avoidPublic) && !(publicOnly || avoidPrivate))
    schoolType = 'private';
  const sizes = (['small', 'medium', 'large'] as const).filter((size) =>
    hasPositive(
      new RegExp(
        `\\b${size === 'large' ? '(?:large|big)' : size}(?:[- ]sized?)?\\s+(?:school|college|campus|university)`,
        'i',
      ),
    ),
  );
  if (hasPositive(/intimate campus/i) && !sizes.includes('small')) sizes.push('small');
  const requestedCount = text.match(LIST_REQUEST)?.[1];
  const count =
    requestedCount && LIST_LENGTHS.includes(Number(requestedCount))
      ? Number(requestedCount)
      : DEFAULT_LIST_LENGTH;
  if (requestedCount && !LIST_LENGTHS.includes(Number(requestedCount)))
    notices.push(
      `You requested ${requestedCount} colleges. Supported list lengths are ${LIST_LENGTHS.join(', ')}; using the default of ${DEFAULT_LIST_LENGTH}.`,
    );
  const profile: StudentProfile = {
    name: name.slice(0, 80),
    subject: primary?.id ?? 'any',
    homeState,
    geography,
    sat,
    act,
    gpa,
    needsAid: hasPositive(
      /financial aid|financial help|needs? aid|scholarship|affordable|low[- ]income|tight budget|cost matters/i,
    ),
    warmWeather:
      hasPositive(/\bwarm(?:er)?\b|sunny/i) || /\bno cold\b|\bavoid\s+(?:cold|winter)/i.test(text),
    handsOn: hasPositive(
      /hands[- ]on|practical|co[- ]?op|experiential|internship|project[- ]based/i,
    ),
    size: sizes.length === 1 ? sizes[0] : 'any',
    schoolType,
    count,
  };
  if (homeState && !explicitHome)
    notices.push(
      `${STATES[homeState]} was mentioned, but residence is unconfirmed. Check the home state before using nearby or cost preferences.`,
    );
  if (!primary)
    notices.push(
      'No supported subject was recognized. Choose a subject below, or keep the search exploratory.',
    );
  const distinctSubjects = mentionedSubjects.filter(
    (s) => !(primary?.id === 'marine' && s.id === 'biology'),
  );
  if (distinctSubjects.length > 1)
    notices.push(
      'Several academic subjects appeared. Confirm the primary interest; coursework can be mistaken for a major.',
    );
  if (sat === null && act === null)
    notices.push(
      'No numeric SAT or ACT score was provided. The list will use Explore labels, with no admission-fit estimate.',
    );
  if (gpa !== null)
    notices.push(
      'GPA is kept as context, not used to predict admission; grading scales and course rigor vary.',
    );
  if (
    /only|must|under \$|budget|not (?:interested|want)|avoid|except|international|outside.*(?:US|U.S.)|public colleges|private colleges/i.test(
      text,
    )
  )
    notices.push(
      'Check any firm requirements in your notes. This starter parser does not reliably interpret every exclusion, budget, residency, or school-type constraint.',
    );
  notices.push(
    'Awards, AP results, personal story, and other details remain counselor context; they do not automatically raise admission chances.',
  );
  return { profile, notices };
}

export function validateProfile(p: StudentProfile): string | null {
  if (!SUBJECTS.some((s) => s.id === p.subject)) return 'Choose a supported subject.';
  if (p.homeState && !STATES[p.homeState]) return 'Choose a valid home state.';
  if (['near-home', 'in-state'].includes(p.geography) && !p.homeState)
    return 'Choose a home state to search nearby, or select Anywhere in the US.';
  if (p.sat !== null && (!Number.isInteger(p.sat) || p.sat < 400 || p.sat > 1600))
    return 'SAT must be a whole number from 400 to 1600, or blank.';
  if (p.act !== null && (!Number.isInteger(p.act) || p.act < 1 || p.act > 36))
    return 'ACT must be a whole number from 1 to 36, or blank.';
  if (p.gpa !== null && (!Number.isFinite(p.gpa) || p.gpa < 0 || p.gpa > 5))
    return 'GPA must be between 0 and 5, or blank.';
  if (!LIST_LENGTHS.includes(p.count))
    return `Choose a shortlist length of ${LIST_LENGTHS.join(', ')}.`;
  if (p.name.length > 80) return 'Keep the student name under 80 characters.';
  return null;
}
