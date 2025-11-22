# MindFlow - AI Voice Coach

A web application that helps users maintain emotional wellbeing through voice journaling combined with AI-powered psychological support.

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, React 18
- **Database & Auth:** Supabase (PostgreSQL + GoTrue)
- **Vector Store:** Supabase pgvector
- **AI Models:** Multiple providers supported (AssemblyAI, Groq, Hugging Face, OpenAI)
- **State Management:** Zustand
- **UI Libraries:** Shadcn/UI, Tailwind CSS, Lucide React

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- AI Provider API keys (see [Setup Guide](#setup))

### Installation

1. **Clone and install:**
```bash
git clone <your-repo-url>
cd mindflow
npm install
```

2. **Set up environment variables:**
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

3. **Set up the database:**
   - Run `db/schema_improved.sql` in your Supabase SQL Editor
   - See `db/SETUP_GUIDE.md` for detailed instructions

4. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Setup

### Environment Variables

Required variables in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Providers (at least one set)
ASSEMBLYAI_API_KEY=your-key          # For transcription
GROQ_API_KEY=your-key                 # For LLM
HUGGINGFACE_API_KEY=your-key          # For embeddings (optional)

# Optional: OpenAI (if you have credits)
OPENAI_API_KEY=your-key
```

See `PROVIDER_SETUP.md` for detailed AI provider setup instructions.

### Database Setup

1. Run the SQL schema in Supabase SQL Editor: `db/schema_improved.sql`
2. Verify setup: Run queries from `db/verify_setup.sql`
3. See `db/SETUP_GUIDE.md` for troubleshooting

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

## Project Structure

```
mindflow/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── transcribe/    # Audio transcription
│   │   ├── journal/       # Journal processing
│   │   └── auth/          # Authentication
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   └── layout.tsx         # Root layout
├── lib/                   # Utility libraries
│   ├── ai/               # AI provider abstraction
│   ├── supabase/         # Supabase clients
│   └── utils.ts          # Utility functions
├── db/                   # Database schemas and migrations
├── types/                 # TypeScript definitions
└── components/           # React components
```

## Documentation

- **PRD.md** - Product Requirements Document
- **PROVIDER_SETUP.md** - AI Provider configuration guide
- **db/SETUP_GUIDE.md** - Database setup instructions

## Security Notes

⚠️ **IMPORTANT:** 
- The `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the frontend
- Never commit `.env.local` to version control
- All API keys should be kept secure

## Development

See `PRD.md` for complete product requirements and specifications.

## License

[Your License Here]

