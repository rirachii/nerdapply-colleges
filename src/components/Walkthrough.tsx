import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code2,
  Database,
  FileDown,
  ShieldCheck,
} from 'lucide-react';
import metadata from '../data/metadata.json';
export function Walkthrough() {
  return (
    <main id="guide-main" className="walkthrough">
      <a className="back-link" href="#">
        <ArrowLeft size={16} />
        Back to the builder
      </a>
      <div className="guide-heading">
        <span className="eyebrow">THE BUILD NOTES</span>
        <h1>
          A thoughtful shortlist.
          <br />
          An explainable system.
        </h1>
        <p>
          The product decisions, technical boundaries, and a five-minute walkthrough of Next
          Chapter.
        </p>
      </div>
      <div className="guide-layout">
        <nav aria-label="Guide sections">
          <a href="#guide-product">01 · Product decision</a>
          <a href="#guide-flow">02 · The demo</a>
          <a href="#guide-architecture">03 · How it works</a>
          <a href="#guide-tradeoffs">04 · Tradeoffs</a>
          <a href="#guide-extend">05 · Extend it live</a>
        </nav>
        <div className="guide-content">
          <section id="guide-product">
            <span className="eyebrow">01 / PRODUCT DECISION</span>
            <h2>The counselor stays in the loop.</h2>
            <p>
              A college list is the start of a conversation with a student. It needs useful options,
              evidence, and next steps. The design centers the counselor’s judgment instead of
              presenting a confident answer to an uncertain admissions question.
            </p>
            <p>
              The workspace takes its layout cues from folk: the student record stays beside the
              active task, so the counselor can compare schools without losing the student’s
              context. Brief, Preferences, College list, and Handout share this structure. On
              phones, student details collapse into a disclosure.
            </p>
            <blockquote>
              Turn messy notes into a reviewable shortlist, then give the student something they can
              actually use.
            </blockquote>
            <p>
              The main deliverable is a real, paginated PDF. It contains the chosen schools, reasons
              to explore them, cost caveats, official links, and a plan for the next conversation.
              The raw counselor description is excluded.
            </p>
          </section>
          <section id="guide-flow">
            <span className="eyebrow">02 / FIVE-MINUTE DEMO</span>
            <h2>Tell the story through the workflow.</h2>
            <ol className="demo-steps">
              <li>
                <strong>Start with the programmer example.</strong>
                <p>
                  Show the free-form prompt and choose Find colleges. The shortlist opens directly.
                  Check the inferred preferences on the left; use Edit preferences to correct the
                  tentative Pennsylvania residence if needed.
                </p>
              </li>
              <li>
                <strong>Explain one recommendation.</strong>
                <p>
                  Open its sources. Separate the reported school facts from the transparent ranking
                  rules and provisional academic category.
                </p>
              </li>
              <li>
                <strong>Exercise counselor control.</strong>
                <p>
                  Change the region or campus size, update the shortlist, and remove a school. Add a
                  short student-facing note in the Handout step.
                </p>
              </li>
              <li>
                <strong>Download the PDF.</strong>
                <p>
                  Use Preview PDF, then download the actual file. Show its readable type, page
                  numbers, official URLs, and omission of the raw notes.
                </p>
              </li>
              <li>
                <strong>Try the marine biology example.</strong>
                <p>
                  “Middling scores” stays unknown. No invented SAT, no inferred admission
                  probability. Marine pathways are a clearly labeled six-school curated set.
                </p>
              </li>
            </ol>
          </section>
          <section id="guide-architecture">
            <span className="eyebrow">03 / HOW IT WORKS</span>
            <h2>Small modules, visible boundaries.</h2>
            <div className="architecture">
              <div>
                <BookOpen />
                <strong>Student story</strong>
                <small>Free-form, in memory</small>
              </div>
              <ArrowRight />
              <div>
                <Code2 />
                <strong>Profile</strong>
                <small>Parse → validate</small>
              </div>
              <ArrowRight />
              <div>
                <Database />
                <strong>Shortlist</strong>
                <small>Filter → rank</small>
              </div>
              <ArrowRight />
              <div>
                <FileDown />
                <strong>Handout</strong>
                <small>Selected facts → PDF</small>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Responsibility</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>parse.ts</code>
                  </td>
                  <td>Recognize supported signals; leave unknowns null and expose assumptions.</td>
                </tr>
                <tr>
                  <td>
                    <code>recommend.ts</code>
                  </td>
                  <td>
                    Apply subject and geographic filters, rank soft preferences, generate
                    evidence-backed reasons.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>colleges.json</code>
                  </td>
                  <td>
                    {metadata.count.toLocaleString()} public-data records, imported reproducibly
                    from College Scorecard.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>specialties.ts</code>
                  </td>
                  <td>
                    Small, manually verified program layer with official URLs and precise claims.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>StudentPdf.tsx</code>
                  </td>
                  <td>
                    Independent print layout; no browser screenshot or print-dialog dependency.
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              React + TypeScript + Vite keep this a static app. The recommendation functions are
              pure. PDF rendering loads on demand. There is no database, paid API, authentication,
              or runtime external lookup.
            </p>
            <div className="guide-note">
              <ShieldCheck />
              <p>
                Student descriptions stay in page memory. No local storage, analytics, or model
                calls. Refreshing clears the work. This demo uses synthetic examples; production
                student records need a separate privacy and access-control design.
              </p>
            </div>
          </section>
          <section id="guide-tradeoffs">
            <span className="eyebrow">04 / TRADEOFFS</span>
            <h2>What I chose. What I would change.</h2>
            <div className="tradeoff">
              <h3>Deterministic extraction first</h3>
              <p>
                A free, reliable demonstration with no credential setup. It recognizes common
                subjects, numeric scores, and preferences, but cannot understand every narrative or
                exclusion. Editable fields are essential. A production LLM should extract a
                validated profile; it should not invent colleges or calculate admissions chances.
              </p>
            </div>
            <div className="tradeoff">
              <h3>Public data over generated facts</h3>
              <p>
                The bundled {metadata.release} Scorecard release has mixed reporting years.
                Degree-family reporting is only a broad subject signal. Six marine pathways and five
                computing programs have extra official-source verification. Program availability,
                price, and deadlines must be rechecked.
              </p>
            </div>
            <div className="tradeoff">
              <h3>Comparison bands, not odds</h3>
              <p>
                Reach: admission rate below 25%, or a score more than 100 SAT points / 3 ACT points
                below the institutional comparator. Safety: at least 100 SAT points / 3 ACT points
                above and admission rate at least 65%. Otherwise Target, when data is available.
                Missing student scores always mean Explore. These are uncalibrated heuristics, not
                validated admission predictions.
              </p>
            </div>
            <div className="tradeoff">
              <h3>Affordability needs a real conversation</h3>
              <p>
                Average net price is historical and cohort-based. Public-college averages should not
                stand in for out-of-state costs. The ranking gives a modest cost preference only to
                comparable averages, and every handout asks families to run the official calculator.
              </p>
            </div>
            <div className="tradeoff">
              <h3>Intentional scope</h3>
              <p>
                US bachelor’s institutions only; no community-college transfer pathways,
                international programs, live admissions outcomes, hard dollar budgets, or complete
                specialty catalog. Size and weather are soft preferences. Home + neighboring states
                is a coarse geography filter, not driving time.
              </p>
            </div>
          </section>
          <section id="guide-extend">
            <span className="eyebrow">05 / EXTEND IT LIVE</span>
            <h2>A good next feature has a clear seam.</h2>
            <ol className="demo-steps">
              <li>
                <strong>Add a strict maximum campus size.</strong>
                <p>
                  Add a typed preference, expose a select, apply it in the eligible filter, and test
                  that larger campuses cannot leak into the result.
                </p>
              </li>
              <li>
                <strong>Add a new academic interest.</strong>
                <p>
                  Map a broad subject in <code>options.ts</code> or add reviewed program evidence.
                  Test the parser and membership before touching the UI.
                </p>
              </li>
              <li>
                <strong>Introduce model-based extraction.</strong>
                <p>
                  Replace the parser behind its typed contract with a server-side provider adapter,
                  schema validation, timeout, and explicit fallback. Keep filtering, ranking,
                  evidence, and PDF generation in code.
                </p>
              </li>
            </ol>
            <h3>How I would measure whether this helps</h3>
            <p>
              Time from notes to a counselor-approved handout, proportion of suggested schools
              retained, correction rate for extracted preferences, source accuracy, and
              accessibility. Review recommendations with counselors before claiming admissions
              accuracy.
            </p>
            <p className="guide-note">
              The GitHub repository includes the application source, tests, and reproducible data
              import scripts.
            </p>
          </section>
        </div>
      </div>
      <footer className="guide-footer">
        Built for the college list builder take-home. An independent prototype.
      </footer>
    </main>
  );
}
