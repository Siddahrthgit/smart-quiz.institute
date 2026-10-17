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
