# MindFlow Development Plan

## Project Overview
AI Voice Coach application for emotional wellbeing through voice journaling with AI-powered psychological support.

## Current Status ✅

### Completed
- [x] Project initialization (Next.js 14, TypeScript)
- [x] Supabase database setup with schema
- [x] Authentication system (email/password)
- [x] Login and Dashboard pages
- [x] Unified AI Provider abstraction layer
- [x] Multiple AI provider implementations (AssemblyAI, Groq, Hugging Face, OpenAI)
- [x] Basic project documentation

## Next Steps 🚀

### Phase 1: Core Voice Journaling (Priority: High)
- [x] Voice recording component
  - [x] Audio recording UI with start/stop controls
  - [x] Audio playback preview
  - [x] File upload handling
- [x] Transcription flow
  - [x] Call `/api/transcribe` endpoint
  - [x] Display transcribed text
  - [x] Allow text editing before submission
- [x] Journal entry creation
  - [x] Save transcription to database
  - [x] Generate embedding
  - [x] Tone detection
  - [x] AI response generation
  - [x] Save complete entry with metadata

### Phase 2: Journal Management (Priority: High) ✅
- [x] Journal entries list view
  - [x] Display user's entries with date/time
  - [x] Pagination or infinite scroll
  - [x] Filter by date range
- [x] Entry detail view
  - [x] Show full transcription
  - [x] Display AI response
  - [x] Show sentiment/emotion tags
  - [x] Show referenced past entries (RAG)
- [x] Entry editing/deletion
  - [x] Allow editing transcription
  - [x] Delete entries

### Phase 3: Dashboard Enhancements (Priority: Medium) ✅
- [x] Mood Horizon chart
  - [x] 7-day moving average sentiment
  - [x] Visual chart (recharts)
  - [x] Trend indicators
- [x] Statistics cards
  - [x] Total entries count
  - [x] Average sentiment score
  - [x] Most common emotions
- [x] Recent entries preview
  - [x] Show last 5 entries
  - [x] Quick access to detail view

### Phase 4: AI Mode Selection (Priority: Medium) ✅
- [x] Mode selector UI
  - [x] Listening mode option
  - [x] Coaching mode option
  - [x] Smart mode option (default)
  - [x] Dashboard quick switch
  - [x] Expandable detailed descriptions
- [x] Mode-specific prompts
  - [x] Different system prompts per mode
  - [x] Mode-aware response generation
- [x] User preference saving
  - [x] Save default mode to profile (auto-update on selection)
  - [x] Store last used mode in localStorage
  - [x] Allow per-entry mode override

### Phase 5: RAG Implementation (Priority: Medium) ✅
- [x] Embedding generation
  - [x] Generate embeddings for new entries (384D HuggingFace, no padding)
  - [x] Store in embeddings table
  - [x] Dimension validation (384D or 1536D)
- [x] Similar entry retrieval
  - [x] Use `match_entries` function (secure version with auth.uid())
  - [x] Display related past entries in entry detail page
  - [x] Show similarity scores with labels (Deep Connection/Related/Somewhat Related)
  - [x] Clickable links to navigate to related entries
- [x] Context injection
  - [x] Include past entries in AI prompt (top 3 entries)
  - [x] Reference patterns in responses
  - [x] Mode-specific RAG usage (coaching/smart/listening)
  - [x] Structured format with metadata (Date, Tone, Content)

### Phase 6: Cost Control & Analytics (Priority: Low)
- [ ] Usage tracking
  - [ ] Log API calls to `usage_logs`
  - [ ] Track tokens and costs
- [ ] Daily limits
  - [ ] Check daily usage before processing
  - [ ] Show usage warnings
- [ ] Cost dashboard
  - [ ] Display cost per session
  - [ ] Monthly cost summary
  - [ ] Cost optimization tips

### Phase 7: UI/UX Refactoring (Priority: Medium) ✅
- [x] Page structure reorganization
  - [x] Dashboard as overview/navigation center
  - [x] Separate analytics page (`/dashboard/analytics`)
  - [x] Journal page for recording (`/dashboard/journal`)
  - [x] Entries list page (`/dashboard/entries`)
- [x] Navigation component
  - [x] Unified navigation bar across dashboard pages
  - [x] Active page highlighting
  - [x] Quick access to all sections

### Phase 8: Polish & Optimization (Priority: Low)
- [ ] Loading states
  - [ ] Skeleton loaders
  - [ ] Progress indicators
- [ ] Error handling
  - [ ] User-friendly error messages
  - [ ] Retry mechanisms
- [ ] Responsive design
  - [ ] Mobile optimization
  - [ ] Tablet layouts
- [ ] Accessibility
  - [ ] ARIA labels
  - [ ] Keyboard navigation
  - [ ] Screen reader support

## Technical Debt
- [ ] Clean up duplicate provider implementations
- [ ] Add proper error boundaries
- [ ] Implement proper logging system
- [ ] Add unit tests for critical functions
- [ ] Optimize database queries
- [ ] Add rate limiting for API routes

## Future Enhancements (Backlog)
- [ ] Google OAuth login
- [ ] Audio playback in entries
- [ ] Export entries (PDF, JSON)
- [ ] Search functionality
- [ ] Tags/categories for entries
- [ ] Reminders/notifications
- [ ] Multi-language support
- [ ] Dark mode toggle

## Notes
- Focus on MVP features first (Phase 1-2)
- Test with real users early
- Monitor costs closely during development
- Keep PRD.md updated as features evolve

