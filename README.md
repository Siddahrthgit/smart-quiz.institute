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

### Connect the assistant to the central IIA engine (optional)

To use the exact same central answering pipeline as the IIA website, configure these server-side environment variables on the Smart Quiz Institute backend:

```env
IIA_ASSISTANT_URL=https://integratedia.duckdns.org/api/assistant/ask
IIA_SHARED_ASSISTANT_KEY=<the-same-random-secret-configured-on-the-IIA-server>
```

Configure `IIA_SHARED_ASSISTANT_KEY` in the IIA server environment too, using a unique random value of at least 32 bytes (for example, generate it with `openssl rand -base64 48`). Never expose this key in frontend variables or commit the real value. If the proxy variables are not configured, the Study Quiz Institute backend uses its own `GEMINI_API_KEY` for answers instead. The proxy is server-to-server and has bounded rate limits.
