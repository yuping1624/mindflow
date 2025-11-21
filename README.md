# MindFlow - AI Voice Coach

A web application that helps users maintain emotional wellbeing through voice journaling combined with AI-powered psychological support.

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, React 18
- **Database & Auth:** Supabase (PostgreSQL + GoTrue)
- **Vector Store:** Supabase pgvector
- **AI Models:** OpenAI (Whisper, GPT-4o, GPT-4o-mini, text-embedding-3-small)
- **State Management:** Zustand
- **UI Libraries:** Shadcn/UI, Tailwind CSS, Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key with sufficient credits

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase and OpenAI credentials

3. Set up the database:
   - Run the SQL commands from the PRD in your Supabase SQL Editor
   - Ensure the `vector` extension is enabled
   - Create all tables and functions as specified

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mindflow/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── transcribe/    # Audio transcription endpoint
│   │   └── journal/       # Journal processing endpoint
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase clients
│   ├── openai/           # OpenAI client
│   └── utils.ts          # Utility functions
├── types/                 # TypeScript type definitions
└── components/           # React components (to be added)
```

## Security Notes

⚠️ **IMPORTANT:** The `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the frontend. It should only be used in API routes or Server Actions.

## Development

See `PRD.md` for complete product requirements and specifications.

