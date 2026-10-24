<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Smart Quiz Institute

Run the app locally with Node.js. The existing local quiz engine can create multiple-choice questions from uploaded study material without a Gemini API key.

## Run locally

1. Install dependencies:

   `npm install`

2. (Optional) Create a `.env.local` file. For local, source-material-based quiz generation, set:

   ```env
   LOCAL_QUIZ_MODE=true
   ```

   You do not need `GEMINI_API_KEY` for this local quiz path. The local generator uses readable text extracted from uploaded PDFs or imported notes. It does not invent questions when it cannot extract enough distinct facts; in that case, add clearer source material and retry.

3. Start the app:

   `npm run dev`

4. Open the local URL printed by the server (normally `http://localhost:3000`), upload/import study material, and generate a quiz from that material.

## AI generation

To use Gemini-powered topic-only quizzes and other AI features, configure a valid `GEMINI_API_KEY` and leave `LOCAL_QUIZ_MODE` unset or set it to `false`.

## Checks

Run the local quiz engine tests with:

```bash
npx tsx --test lib/localQuizEngine.test.ts
npm run build
```


## Ask IIA assistant

A floating **Ask IIA** launcher is available on every main app page. It answers general questions, can search the web and display grounded source links, can use study material loaded in the current session, and supports multi-step requests. Login/sign-up is available from the same bottom-right panel. The existing quiz, upload, exam and performance flows remain in place.

The `POST /api/assistant/ask` endpoint uses the existing Gemini server key. The local fact extractor remains a deterministic offline fallback for MCQs only; it is not a general-purpose language model.

### Separate service and data boundaries

StudyPDF is intentionally independent from IIA. Its assistant uses StudyPDF's own server-side `GEMINI_API_KEY`, document store, authentication/guest ownership, and rate limits. It does not proxy assistant prompts or uploaded material to `integratedia.duckdns.org`. Keep the two deployments, credentials, and user data separate. The local quiz generator can still create source-based MCQs when `LOCAL_QUIZ_MODE=true`; it is not a general-purpose AI fallback.
