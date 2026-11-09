# ⚖️ Haven Delhi Supreme Court

A live, real-time courtroom web application built for the **Hack Club Haven** game jam. Themed with Haven's sunny aesthetic (warm golden-orange gradients, custom hedgehog mascots, ribbon banners, and playful Fredoka typography) and engineered to **Apple Human Interface Guidelines** (crisp contrast, tactile feedback, and accessible 44pt touch targets).

Powered by **SvelteKit** (Svelte 5 Runes), **Bun**, and **Neon Serverless PostgreSQL**.

---

## 🌟 Highlights

- **🎥 Projector / Spectator Display (`/`)**:
  - **100% Non-Scrolling Viewport (`100vh`)**: Specifically designed for large auditoriums, TV screens, and projectors with zero scrollbar clutter.
  - **Single-Case Focus**: Large, legible showdown cards displaying **The Accuser** vs. **The Defendant**, the **Charge & Particulars**, and the official verdict.
  - **Minimalist Verdict Reveal**: Bold official rubber stamps (**`GUILTY`** in red or **`NOT GUILTY`** in emerald) or a pulsating **`🤔 JUDGE IS STILL THINKING...`** status badge.
  - **Offline Gavel Synthesizer**: Deep wooden gavel knocks and fanfare generated purely via the browser's Web Audio API (no external MP3 downloads required).

- **⚖️ Judge Control Chambers (`/judge`)**:
  - **"One Panel, One Stage" Architecture**: Presiding judges can make last-minute edits to the **Accuser**, **Defendant**, or **Charges** live on stage with debounced auto-save.
  - **1-Click Rapid Decisions**:
    - `🔨 GUILTY`: Pronounces guilt, strikes the wooden gavel, and reveals the red seal on the spectator screen.
    - `🕊️ NOT GUILTY`: Acquits the defendant and plays celebration fanfare.
    - `🤔 STILL THINKING`: Re-opens deliberation with a live thinking indicator.
  - **Live Docket Manager**: File as many cases as desired, swap any case to the live stage with one click (`Put on Stage ⚡`), or dismiss cases.

- **⚡ Neon Serverless PostgreSQL**:
  - Direct connection to Neon PostgreSQL via `@neondatabase/serverless`.
  - Automatic table creation and database migrations on startup with concurrency locking.
  - Real-time updates pushed over Server-Sent Events (SSE) with polling fallback.
  - **Zero-Config Fallback**: Automatically falls back to an in-memory store if `DATABASE_URL` is omitted, ensuring instant offline testing.

---

## 🛠️ Tech Stack

- **Framework**: [SvelteKit 2 / Svelte 5](https://svelte.dev/) (Runes syntax `$state`, `$derived`, `$props`)
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Database**: [Neon](https://neon.tech/) Serverless PostgreSQL (`@neondatabase/serverless`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Audio**: Web Audio API (real-time wooden resonance synthesizer)
- **Typography**: Google Fonts ([Fredoka](https://fonts.google.com/specimen/Fredoka) & [Gaegu](https://fonts.google.com/specimen/Gaegu))

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine (`bun -v`).

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/Haven-Delhi-Supreme-court.git
cd Haven-Delhi-Supreme-court
bun install
```

### 2. Configure Neon Database

Copy the example environment configuration:

```bash
cp .env.example .env
```

Add your Neon PostgreSQL connection string into `.env`:

```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-patient-hill-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

> **Note**: If you leave `DATABASE_URL` empty, the app will automatically run using its built-in local store with pre-seeded cases.

### 3. Start Development Server

```bash
bun run dev
```

Visit the application in your browser:
- **Audience / Projector Screen**: [http://localhost:5173/](http://localhost:5173/)
- **Judge Control Chambers**: [http://localhost:5173/judge](http://localhost:5173/judge)

---

## 🧪 Testing

The project includes an automated test suite powered by Bun's native test runner (`bun test`), testing real-time events, database CRUD, and REST endpoints:

```bash
# Run all unit and integration tests
bun test

# Type-check TypeScript and Svelte templates
bun run check
```

---

## 🏗️ Production Build

Create an optimized production bundle:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

---

## 📂 Project Structure

```text
├── src/
│   ├── app.html                 # Google Fonts preconnect & meta viewport
│   ├── lib/
│   │   ├── types.ts             # TypeScript definitions for CourtCase & inputs
│   │   ├── components/
│   │   │   ├── HedgehogMascot.svelte  # Vector SVG Haven hedgehog mascots
│   │   │   ├── HavenRibbon.svelte     # Notched ribbon banners (from Haven poster)
│   │   │   ├── VerdictStamp.svelte    # Bold official verdict seal
│   │   │   └── GavelSound.ts          # Synthesized Web Audio API gavel sound
│   │   └── server/
│   │       ├── db.ts            # Neon PostgreSQL client with graceful fallback
│   │       └── events.ts        # Server-Sent Events (SSE) notification bus
│   └── routes/
│       ├── +layout.svelte       # Root layout
│       ├── layout.css           # Tailwind CSS v4 & Haven theme palette
│       ├── +page.svelte         # Large-screen Spectator / Projector View
│       ├── judge/+page.svelte   # "One Panel, One Stage" Judge Control Room
│       └── api/
│           ├── cases/           # REST endpoints (GET, POST)
│           ├── cases/[id]/      # REST endpoints (PATCH, DELETE)
│           ├── cases/activate/  # Stage switcher endpoint (POST)
│           └── stream/          # Server-Sent Events real-time broadcast
├── tests/
│   ├── events.test.ts           # Event bus unit tests
│   ├── db.test.ts               # Database CRUD & verdict tests
│   └── api.test.ts              # Endpoint integration tests
└── package.json
```

---

## 📜 License

Created with ❤️ for Hack Club Haven • Delhi Edition.
