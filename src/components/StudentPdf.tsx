import { Document, Font, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { GEOGRAPHIES, STATES, money, percent, scorecardUrl, subjectLabel } from '../lib/options';
import type { Recommendation, StudentProfile } from '../lib/types';

// Prevent a long pasted token from escaping the printable area.
const wrapInput = (text: string) =>
  text.replace(/\S{40,}/gu, (token) =>
    Array.from(token)
      .reduce<string[]>((parts, char, index) => {
        if (index % 32 === 0) parts.push('');
        parts[parts.length - 1] += char;
        return parts;
      }, [])
      .join('\n'),
  );

export function registerPdfFonts(base = '') {
  Font.register({
    family: 'Noto Sans',
    fonts: [
      { src: `${base}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans',
    fontSize: 9,
    color: '#172b4d',
    paddingTop: 92,
    paddingBottom: 46,
    paddingHorizontal: 40,
  },
  top: {
    position: 'absolute',
    top: 36,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
    marginBottom: 18,
  },
  brand: { width: 130, height: 26, objectFit: 'contain', objectPosition: 'center' },
  topRight: { fontSize: 8, color: '#64748b' },
  kicker: { fontSize: 8, letterSpacing: 1.2, color: '#2563eb', marginBottom: 10, fontWeight: 700 },
  title: { fontSize: 25, lineHeight: 1.2, letterSpacing: -0.8, fontWeight: 700, marginBottom: 14 },
  subtitle: { fontSize: 10, lineHeight: 1.5, color: '#475569', marginBottom: 15 },
  profile: { backgroundColor: '#eff6ff', padding: 12, borderRadius: 4, marginBottom: 13 },
  profileLine: { fontSize: 8, marginBottom: 3 },
  label: { fontWeight: 700 },
  section: { fontSize: 12, fontWeight: 700, marginBottom: 9, marginTop: 8 },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 7,
    borderBottomWidth: 0.7,
    borderBottomColor: '#bfdbfe',
    color: '#475569',
    fontSize: 8,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    fontSize: 9,
  },
  number: { width: 24, color: '#2563eb' },
  school: { flex: 1, paddingRight: 9 },
  location: { width: 40 },
  band: { width: 84, textAlign: 'right', fontSize: 8 },
  note: {
    fontSize: 9,
    marginTop: 12,
    marginBottom: 12,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  steps: { fontSize: 9, lineHeight: 1.7, marginBottom: 6 },
  fine: { fontSize: 7, lineHeight: 1.4, color: '#64748b' },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    height: 18,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#64748b',
  },
  college: {
    paddingBottom: 15,
    marginBottom: 16,
    borderBottomWidth: 0.7,
    borderBottomColor: '#e2e8f0',
  },
  collegeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  collegeNumber: { fontSize: 9, color: '#2563eb' },
  collegeName: { fontSize: 17, lineHeight: 1.2, fontWeight: 700, marginBottom: 7 },
  collegeMeta: { fontSize: 8, color: '#64748b', marginBottom: 10 },
  stats: { flexDirection: 'row', padding: 8, backgroundColor: '#eff6ff', marginBottom: 8 },
  stat: { flex: 1, paddingRight: 6 },
  statLabel: { fontSize: 6.7, color: '#64748b', marginBottom: 4 },
  statValue: { fontSize: 11, fontWeight: 700 },
  subheading: { fontSize: 8.5, fontWeight: 700, marginBottom: 3, marginTop: 5 },
  body: { fontSize: 8.5, lineHeight: 1.4, marginBottom: 4 },
  link: { fontSize: 7.3, color: '#1d4ed8', textDecoration: 'underline', flexShrink: 1 },
  linkRow: { marginTop: 4, flexDirection: 'row', gap: 5 },
});
function Header({ right, logoSrc }: { right: string; logoSrc: string }) {
  return (
    <View style={styles.top} fixed>
      <Image style={styles.brand} src={logoSrc} />
      <Text style={styles.topRight}>{right}</Text>
    </View>
  );
}
function Footer() {
  return (
    <Text
      fixed
      style={{
        position: 'absolute',
        bottom: 24,
        left: 40,
        right: 40,
        fontFamily: 'Helvetica',
        fontSize: 7,
        color: '#64748b',
      }}
      render={({ pageNumber, totalPages }) =>
        `NerdApply · College exploration, not an admission guarantee                                      ${pageNumber} / ${totalPages}`
      }
    />
  );
}
function Url({ label, url }: { label: string; url: string }) {
  return (
    <View style={styles.linkRow}>
      <Text style={styles.fine}>{label}: </Text>
      <Link style={styles.link} src={url}>
        {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </Link>
    </View>
  );
}
export function StudentPdf({
  profile,
  items,
  note,
  date = new Date(),
  logoSrc,
}: {
  profile: StudentProfile;
  items: Recommendation[];
  note: string;
  date?: Date;
  logoSrc: string;
}) {
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  const groups: Recommendation[][] = [];
  for (let i = 0; i < items.length; i += 2) groups.push(items.slice(i, i + 2));
  return (
    <Document
      title={`${profile.name || 'Your'} college exploration guide`}
      author="NerdApply"
      subject="College shortlist for counselor review"
      language="en-US"
    >
      <Page size="LETTER" style={styles.page}>
        <Header right={dateLabel} logoSrc={logoSrc} />
        <Text style={styles.kicker}>YOUR COLLEGE EXPLORATION GUIDE</Text>
        <Text style={styles.title}>
          {profile.name
            ? `${wrapInput(profile.name)},\nyour next chapter starts here.`
            : 'Your next chapter\nstarts here.'}
        </Text>
        <Text style={styles.subtitle}>
          Good possibilities, thoughtful questions, and a plan for what comes next. Explore these
          colleges with your counselor and make the list your own.
        </Text>
        <View style={styles.profile}>
          <Text style={styles.profileLine}>
            <Text style={styles.label}>Academic interest: </Text>
            {subjectLabel(profile.subject)}
          </Text>
          <Text style={styles.profileLine}>
            <Text style={styles.label}>Where to look: </Text>
            {GEOGRAPHIES.find((g) => g[0] === profile.geography)?.[1]}
            {profile.homeState ? ` · Home: ${STATES[profile.homeState]}` : ''}
          </Text>
          <Text style={styles.profileLine}>
            <Text style={styles.label}>Priorities: </Text>
            {[
              profile.needsAid ? 'Affordability' : null,
              profile.handsOn ? 'Hands-on learning' : null,
              profile.warmWeather ? 'Warmer weather' : null,
              profile.size !== 'any' ? `${profile.size} campus` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Explore a range of opportunities'}
          </Text>
          <Text style={styles.profileLine}>
            <Text style={styles.label}>Academic context: </Text>
            {[
              profile.sat !== null ? `SAT ${profile.sat}` : null,
              profile.act !== null ? `ACT ${profile.act}` : null,
              profile.gpa !== null ? `GPA ${profile.gpa} (scale unconfirmed; context only)` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Scores not provided; academic fit is unclassified.'}
          </Text>
        </View>
        <Text style={styles.section}>Your shortlist at a glance</Text>
        <View style={styles.tableHead}>
          <Text style={styles.number}>#</Text>
          <Text style={styles.school}>COLLEGE</Text>
          <Text style={styles.location}>STATE</Text>
          <Text style={styles.band}>COMPARISON</Text>
        </View>
        {items.map((r, i) => (
          <View key={r.college.id} style={styles.row} wrap={false}>
            <Text style={styles.number}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.school}>{r.college.name}</Text>
            <Text style={styles.location}>{r.college.state}</Text>
            <Text style={styles.band}>{r.band}</Text>
          </View>
        ))}
        {note.trim() && (
          <View style={styles.note} wrap={false}>
            <Text style={styles.label}>A note from your counselor</Text>
            <Text>{wrapInput(note.trim())}</Text>
          </View>
        )}
        <Text style={styles.fine}>
          Categories are provisional comparisons based on reported institutional test data and
          selectivity. They are not your chance of admission. Your intended major, courses,
          application, residency, and financial circumstances need separate review.
        </Text>
        <Footer />
      </Page>
      {groups.map((group, g) => (
        <Page key={g} size="LETTER" style={styles.page}>
          <Header
            logoSrc={logoSrc}
            right={`${profile.name ? profile.name.slice(0, 32) : 'Your student guide'} · The colleges`}
          />
          {group.map((r, i) => {
            const c = r.college;
            return (
              <View key={c.id} style={styles.college} wrap={false}>
                <View style={styles.collegeTop}>
                  <Text style={styles.collegeNumber}>
                    COLLEGE {String(g * 2 + i + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.collegeNumber}>{r.band.toUpperCase()}</Text>
                </View>
                <Text style={styles.collegeName}>{c.name}</Text>
                <Text style={styles.collegeMeta}>
                  {c.city}, {c.state} · {c.control} · {c.size.toLocaleString()} undergraduates
                </Text>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>AVG. ANNUAL NET PRICE*</Text>
                    <Text style={styles.statValue}>{money(c.netPrice)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>OVERALL ADMISSION RATE</Text>
                    <Text style={styles.statValue}>{percent(c.admissionRate)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>AVG. SAT OF SUBMITTERS</Text>
                    <Text style={styles.statValue}>{c.satAverage ?? 'Not reported'}</Text>
                  </View>
                </View>
                <Text style={styles.fine}>{r.academicContext}</Text>
                <Text style={styles.subheading}>Why explore it</Text>
                {r.reasons.slice(0, 2).map((t) => (
                  <Text style={styles.body} key={t}>
                    {t}
                  </Text>
                ))}
                <Text style={styles.subheading}>Bring these questions to your counselor</Text>
                {r.considerations.slice(0, 2).map((t) => (
                  <Text style={styles.body} key={t}>
                    {t}
                  </Text>
                ))}
                <Text style={styles.fine}>
                  *Historical cohort average, not your price or aid offer. Public-college averages
                  generally reflect in-state students. Scorecard June 2026 release; reporting years
                  vary.
                </Text>
                <Url label="Institutional data" url={scorecardUrl(c.id)} />
                {r.evidence.find((e) => e.label !== 'College Scorecard') && (
                  <Url label="Official program details" url={r.evidence[0].url} />
                )}
                <Url
                  label={c.calculator ? 'Estimate your cost' : 'College website'}
                  url={c.calculator || c.website || scorecardUrl(c.id)}
                />
              </View>
            );
          })}
          <Footer />
        </Page>
      ))}
      <Page size="LETTER" style={styles.page}>
        <Header right="Your next steps" logoSrc={logoSrc} />
        <Text style={styles.kicker}>FROM A LIST TO A PLAN</Text>
        <Text style={styles.title}>{'Make room for\nwhat matters to you.'}</Text>
        <Text style={styles.subtitle}>
          You do not need to decide today. Start with a few questions, then bring what you learn to
          your next counseling conversation.
        </Text>
        {[
          [
            '01',
            'Explore the actual program',
            'Find the current major requirements and ask how students get into labs, projects, internships, or co-ops. A subject-family match is not confirmation of a specific major.',
          ],
          [
            '02',
            'Get a realistic cost picture',
            'Use each college’s net price calculator with your family. Compare tuition, housing, travel, grants, and loans. Aid eligibility and out-of-state costs can change the answer.',
          ],
          [
            '03',
            'Picture your everyday life',
            'Attend an information session, talk to a current student, or plan a visit. Consider campus size, support, travel from home, and the local climate.',
          ],
          [
            '04',
            'Build your application plan',
            'Confirm current deadlines, testing rules, and major-specific admission requirements. Review an appropriate range of options with your counselor.',
          ],
        ].map(([n, title, body]) => (
          <View key={n} style={{ marginBottom: 19 }} wrap={false}>
            <Text style={styles.subheading}>
              {n} {title}
            </Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
        <Text style={styles.section}>Understanding your list</Text>
        <Text style={styles.fine}>
          Reach: the college is highly selective, or your score is below the institutional
          comparator. Target: your score is near or above the comparator; selectivity still matters.
          Safety: your score is above it and the overall admission rate is at least 65%. Explore:
          comparable information is missing. No category guarantees admission or affordability. GPA,
          awards, and AP results are not used to compute these categories.
        </Text>
        <Text style={[styles.fine, { marginTop: 10 }]}>
          This prototype uses US public and private nonprofit bachelor’s institutions. Marine
          biology draws from six verified program pathways; other subjects use broad reported degree
          families. Nearby means home and neighboring states, not driving distance. Warmer weather
          and campus size are preferences, not guarantees.
        </Text>
        <Url
          label="Public data and definitions · Release June 10, 2026 · Reviewed September 24, 2026"
          url="https://collegescorecard.ed.gov/data/"
        />
        <Text style={[styles.fine, { marginTop: 10 }]}>
          Prepared from the student preferences used for this shortlist. This is an exploration
          guide, not official admissions or financial-aid advice. Always verify current information
          with the college.
        </Text>
        <Footer />
      </Page>
    </Document>
  );
}
