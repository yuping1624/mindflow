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

### Phase 2: Journal Management (Priority: High)
- [ ] Journal entries list view
  - [ ] Display user's entries with date/time
  - [ ] Pagination or infinite scroll
  - [ ] Filter by date range
- [ ] Entry detail view
  - [ ] Show full transcription
  - [ ] Display AI response
  - [ ] Show sentiment/emotion tags
  - [ ] Show referenced past entries (RAG)
- [ ] Entry editing/deletion
  - [ ] Allow editing transcription
  - [ ] Delete entries

### Phase 3: Dashboard Enhancements (Priority: Medium)
- [ ] Mood Horizon chart
  - [ ] 7-day moving average sentiment
  - [ ] Visual chart (recharts or similar)
  - [ ] Trend indicators
- [ ] Statistics cards
  - [ ] Total entries count
  - [ ] Average sentiment score
  - [ ] Most common emotions
- [ ] Recent entries preview
  - [ ] Show last 5 entries
  - [ ] Quick access to detail view

### Phase 4: AI Mode Selection (Priority: Medium)
- [ ] Mode selector UI
  - [ ] Listening mode option
  - [ ] Coaching mode option
  - [ ] Smart mode option (default)
- [ ] Mode-specific prompts
  - [ ] Different system prompts per mode
  - [ ] Mode-aware response generation
- [ ] User preference saving
  - [ ] Save default mode to profile
  - [ ] Allow per-entry mode override

### Phase 5: RAG Implementation (Priority: Medium)
- [ ] Embedding generation
  - [ ] Generate embeddings for new entries
  - [ ] Store in embeddings table
- [ ] Similar entry retrieval
  - [ ] Use `match_entries` function
  - [ ] Display related past entries
  - [ ] Show similarity scores
- [ ] Context injection
  - [ ] Include past entries in AI prompt
  - [ ] Reference patterns in responses

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

### Phase 7: Polish & Optimization (Priority: Low)
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

