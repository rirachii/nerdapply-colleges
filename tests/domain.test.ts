import { describe, expect, it } from 'vitest';
import { EXAMPLES, NEIGHBORS, SUBJECTS } from '../src/lib/options';
import { parseStudent, validateProfile, validatePrompt } from '../src/lib/parse';
import { admissionBand, colleges, recommend } from '../src/lib/recommend';
import { specialties } from '../src/data/specialties';
import metadata from '../src/data/metadata.json';
import type { StudentProfile } from '../src/lib/types';
const john = () => parseStudent(EXAMPLES[0].text).profile;
const marine = () => parseStudent(EXAMPLES[1].text).profile;

describe('free-form profile extraction', () => {
  it('fills preferences from labeled shorthand and formatted scores', () => {
    const { profile } = parseStudent(
      'Name: Maya Chen; home state:ca; interested in CS; SAT 1,420; GPA: 3.8; wants 8 colleges, medium-sized campus, public only, west coast, needs financial help, prefers warmer weather and project-based learning.',
    );
    expect(profile).toMatchObject({
      name: 'Maya Chen',
      homeState: 'CA',
      subject: 'computing',
      sat: 1420,
      gpa: 3.8,
      count: 8,
      size: 'medium',
      schoolType: 'public',
      geography: 'west',
      needsAid: true,
      warmWeather: true,
      handsOn: true,
    });
  });
  it('reads a name heading and conversational scores', () => {
    expect(
      parseStudent(
        'Jordan Lee\nFrom New Jersey. Interested in engineering. Scored 1320 on the SAT, ACT score of 29. Unweighted GPA of 3.65. Looking for 4 schools close to home.',
      ).profile,
    ).toMatchObject({
      name: 'Jordan Lee',
      homeState: 'NJ',
      sat: 1320,
      act: 29,
      gpa: 3.65,
      count: 4,
      geography: 'near-home',
    });
  });
  it('recognizes case-insensitive explicit name labels', () => {
    expect(
      parseStudent('Student name: alex rivera; likes engineering, from California.').profile.name,
    ).toBe('alex rivera');
  });
  it('does not confuse ordinary prose with a student name', () => {
    expect(
      parseStudent('Quiet kid, loves marine biology and needs financial aid.').profile.name,
    ).toBe('');
  });
  it('keeps unrestricted school type and negated priorities neutral', () => {
    expect(
      parseStudent(
        'A student named Avery Park, interested in biology. Open to public or private schools. Does not need financial aid. Does not want hands-on learning or warm weather.',
      ).profile,
    ).toMatchObject({ schoolType: 'any', needsAid: false, handsOn: false, warmWeather: false });
  });
  it('does not turn excluded settings into positive preferences', () => {
    expect(
      parseStudent(
        'A student interested in business. Does not want a small campus. Avoid private colleges. No preference for warm weather.',
      ).profile,
    ).toMatchObject({ size: 'any', schoolType: 'public', warmWeather: false });
  });
  it('leaves conflicting test scores for counselor review', () => {
    const result = parseStudent(
      'A student interested in biology; SAT 1200 in March, SAT 1350 in June.',
    );
    expect(result.profile.sat).toBeNull();
    expect(result.notices.join(' ')).toContain('Several SAT scores');
  });
  it.each(['SAT 1230.5', 'SAT 12345', 'SAT 1,23', 'GPA 3.999', 'ACT 290'])(
    'does not truncate malformed score %s',
    (score) => {
      expect(parseStudent(`A student loves programming; ${score}.`).profile).toMatchObject({
        sat: null,
        act: null,
        gpa: null,
      });
    },
  );
  it.each([10, 15, 20, 25])('accepts a requested list of %i colleges', (count) => {
    const profile = parseStudent(
      `A student loves programming and wants ${count} colleges.`,
    ).profile;
    expect(profile.count).toBe(count);
    expect(validateProfile(profile)).toBeNull();
    expect(recommend({ ...john(), count }).items).toHaveLength(count);
  });
  it.each(['Give me 25 schools', 'Show me 25 colleges', 'Recommend 25 universities'])(
    'accepts a concise list request: %s',
    (brief) => {
      expect(validatePrompt(brief)).toBeNull();
      const { profile } = parseStudent(brief);
      expect(profile.count).toBe(25);
      expect(validateProfile(profile)).toBeNull();
      expect(recommend(profile).items).toHaveLength(25);
    },
  );
  it('keeps unsupported requested list lengths explicit', () => {
    const result = parseStudent('A student loves programming and wants 12 colleges.');
    expect(result.profile.count).toBe(10);
    expect(result.notices.join(' ')).toContain('12');
  });
  it('extracts the supplied programmer without confusing AP scores with SAT/GPA', () => {
    const { profile, notices } = parseStudent(EXAMPLES[0].text);
    expect(profile).toMatchObject({
      name: 'John Smith',
      sat: 1230,
      gpa: 3.5,
      subject: 'computing',
      homeState: 'PA',
      geography: 'near-home',
      handsOn: true,
    });
    expect(notices.some((n) => n.includes('residence is unconfirmed'))).toBe(true);
  });
  it('does not turn middling scores or a personality into made-up scores', () => {
    expect(marine()).toMatchObject({
      name: '',
      sat: null,
      act: null,
      gpa: null,
      subject: 'marine',
      needsAid: true,
      warmWeather: true,
    });
  });
  it('recognizes ACT and reversed score notation', () =>
    expect(
      parseStudent('A student from Florida loves biology. SAT: 1300, ACT 28, GPA 3.7.').profile,
    ).toMatchObject({ sat: 1300, act: 28, gpa: 3.7, homeState: 'FL' }));
  it('stops the student name at the end of its sentence', () => {
    expect(
      parseStudent('Her name is Jane Doe. She loves biology and wants practical learning.').profile
        .name,
    ).toBe('Jane Doe');
  });
  it('favors an intended major over earlier coursework', () => {
    expect(
      parseStudent('AP biology student, interested in engineering. Wants practical projects.')
        .profile.subject,
    ).toBe('engineering');
  });
  it('preserves the existing intimate-campus wording', () => {
    expect(
      parseStudent('A student loves biology and prefers an intimate campus.').profile.size,
    ).toBe('small');
  });
  it('does not assign an adjacent score to the wrong test', () => {
    expect(parseStudent('Name: Maya Chen; biology; SAT 1420 ACT 31 GPA 3.8').profile).toMatchObject(
      { sat: 1420, act: 31, gpa: 3.8 },
    );
  });
  it('supports accented names', () =>
    expect(
      parseStudent('A student named José García, interested in engineering.').profile.name,
    ).toBe('José García'));
  it('flags unsupported SAT instead of silently using it', () => {
    const p = parseStudent('A student has a 1900 SAT and loves programming.');
    expect(p.profile.sat).toBeNull();
    expect(p.notices.some((n) => n.includes('outside'))).toBe(true);
  });
  it('prioritizes an explicit home state over a location preference', () =>
    expect(
      parseStudent('A student from Texas wants colleges in California, loves engineering.').profile
        .homeState,
    ).toBe('TX'));
  it('recognizes public colleges and West geography', () =>
    expect(parseStudent(EXAMPLES[2].text).profile).toMatchObject({
      schoolType: 'public',
      geography: 'west',
    }));
  it('does not reward negated aid or warm-weather requests', () =>
    expect(
      parseStudent('A student loves biology, no financial aid needed, does not want warm weather.')
        .profile,
    ).toMatchObject({ needsAid: false, warmWeather: false }));
  it('makes unsupported interests explicitly exploratory', () => {
    const result = parseStudent('A student is interested in Egyptology and wants a small campus.');
    expect(result.profile.subject).toBe('any');
    expect(result.notices.some((n) => n.includes('No supported subject'))).toBe(true);
  });
  it('rejects empty, very short, and oversized prompts', () => {
    expect(validatePrompt('')).not.toBeNull();
    expect(validatePrompt('biology')).not.toBeNull();
    expect(validatePrompt('a'.repeat(4001))).not.toBeNull();
    expect(validatePrompt(EXAMPLES[0].text)).toBeNull();
  });
  it('does not rank nearby options when a home state is missing', () => {
    const p = parseStudent('Student loves programming and wants to stay close to home.').profile;
    expect(validateProfile(p)).toContain('home state');
    expect(recommend(p).items).toHaveLength(0);
  });
  it.each([
    { sat: 1601 },
    { sat: 1234.5 },
    { act: 37 },
    { gpa: -1 },
    { gpa: NaN },
    { homeState: 'ZZ' },
  ])('validates edited fields %j', (patch) =>
    expect(validateProfile({ ...john(), ...patch })).not.toBeNull(),
  );
});

describe('recommendations and uncertainty', () => {
  it('returns unique, real computing colleges within the requested states', () => {
    const r = recommend(john());
    expect(r.items).toHaveLength(10);
    expect(new Set(r.items.map((i) => i.college.id)).size).toBe(10);
    for (const item of r.items) {
      expect(['PA', ...NEIGHBORS.PA]).toContain(item.college.state);
      expect(item.college.programs).toContain('11');
    }
    expect(r.items.some((item) => item.college.name === 'Drexel University')).toBe(true);
  });
  it('uses only verified marine pathways and Not enough data for the sparse example', () => {
    const r = recommend(marine());
    expect(r.items).toHaveLength(6);
    expect(r.items.every((i) => i.band === 'Not enough data')).toBe(true);
    for (const item of r.items)
      expect(specialties[item.college.id].some((s) => s.subject === 'marine')).toBe(true);
  });
  it('never relaxes a hard geographic constraint to fill the requested slots', () => {
    const r = recommend({ ...marine(), geography: 'in-state', homeState: 'AK' });
    expect(r.items).toEqual([]);
    expect(r.notices.some((n) => n.includes('not silently relaxed'))).toBe(true);
  });
  it('respects public-only filtering', () => {
    const r = recommend({ ...john(), schoolType: 'public' });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((r) => r.college.control === 'Public')).toBe(true);
  });
  it('respects requested list size and caps duplicate institution families', () => {
    const r = recommend({ ...john(), count: 8 });
    expect(r.items).toHaveLength(8);
    for (const item of r.items)
      expect(
        r.items.filter((r) => r.college.family === item.college.family).length,
      ).toBeLessThanOrEqual(2);
  });
  it('missing scores never become a Reach, even at highly selective colleges', () =>
    expect(admissionBand({ ...colleges[0], admissionRate: 0.05 }, marine())).toBe(
      'Not enough data',
    ));
  it('missing school data remains Not enough data', () =>
    expect(admissionBand({ ...colleges[0], satAverage: null, admissionRate: null }, john())).toBe(
      'Not enough data',
    ));
  it('uses ACT if no comparable SAT exists', () =>
    expect(
      admissionBand(
        { ...colleges[0], satAverage: null, actMidpoint: 25, admissionRate: 0.8 },
        { ...john(), sat: null, act: 30 },
      ),
    ).toBe('Safety'));
  it('keeps selective institutions Reach even for high scores', () =>
    expect(
      admissionBand(
        { ...colleges[0], admissionRate: 0.15, satAverage: 1200 },
        { ...john(), sat: 1600 },
      ),
    ).toBe('Reach'));
  it('GPA alone cannot change ranking or categories', () =>
    expect(recommend({ ...john(), gpa: 2 }).items).toEqual(recommend({ ...john(), gpa: 5 }).items));
  it('affordability never describes an average as a personal aid offer', () => {
    for (const item of recommend(marine()).items)
      expect(item.considerations.some((c) => c.includes('not your aid offer'))).toBe(true);
  });
  it('is deterministic and does not mutate inputs', () => {
    const p = Object.freeze(john());
    expect(recommend(p)).toEqual(recommend(p));
  });
  it('all supported subject searches execute without invented IDs', () => {
    for (const subject of SUBJECTS) {
      const r = recommend({ ...marine(), subject: subject.id });
      expect(r.items.every((r) => colleges.some((c) => c.id === r.college.id))).toBe(true);
    }
  });
});

describe('public data integrity', () => {
  it('metadata, unique identifiers, and required fields agree', () => {
    expect(colleges.length).toBe(metadata.count);
    expect(new Set(colleges.map((c) => c.id)).size).toBe(colleges.length);
    expect(colleges.every((c) => c.name && c.size > 0 && c.family)).toBe(true);
  });
  it('keeps numeric nulls distinct from zero', () => {
    expect(colleges.some((c) => c.satAverage === null)).toBe(true);
    expect(
      colleges.every((c) => c.satAverage === null || (c.satAverage >= 400 && c.satAverage <= 1600)),
    ).toBe(true);
    expect(
      colleges.every(
        (c) => c.admissionRate === null || (c.admissionRate >= 0 && c.admissionRate <= 1),
      ),
    ).toBe(true);
  });
  it('only ships safe web links', () => {
    for (const c of colleges)
      for (const url of [c.website, c.calculator])
        if (url) expect(['https:', 'http:']).toContain(new URL(url).protocol);
  });
  it('joins verified program facts to the correct institutions', () => {
    const names: Record<number, string> = {
      199218: 'University of North Carolina Wilmington',
      218724: 'Coastal Carolina University',
      133492: 'Eckerd College',
      133881: 'Florida Institute of Technology',
      137351: 'University of South Florida',
      224147: 'Texas A & M University-Corpus Christi',
      212054: 'Drexel University',
      195003: 'Rochester Institute of Technology',
      216764: 'West Chester University of Pennsylvania',
      216010: 'Shippensburg University of Pennsylvania',
      216339: 'Temple University',
    };
    expect(Object.keys(specialties).sort()).toEqual(Object.keys(names).sort());
    for (const [id, name] of Object.entries(names))
      expect(colleges.find((c) => c.id === Number(id))?.name).toBe(name);
  });
});
