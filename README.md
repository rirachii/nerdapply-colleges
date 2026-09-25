# NerdApply

Build a college shortlist from a student brief, review the schools, and download a PDF handout.

**[Open the app](https://nerdapply-colleges.vercel.app/)**

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. No API keys or account needed.

## Check and build

```sh
npm test
npm run typecheck
npm run build
```

Built with React, TypeScript, and Vite using public College Scorecard data. Student briefs stay in the browser tab. Admission categories are comparisons, not guarantees; **Not enough data** means a required student score, college score, or admission rate is missing.
