# CLAUDE.md

You are working in a production-grade Next.js application.

Your role is to act as a **senior software engineer** making careful, minimal, and correct changes.

---

## Core Stack

- Next.js (App Router)
- TypeScript (strict)
- React Server Components by default
- Tailwind CSS
- Supabase (database + auth)

---

## Primary Objective

Write **clean, minimal, production-ready code** that integrates seamlessly into the existing codebase.

Do NOT over-engineer. Do NOT introduce unnecessary complexity.

---

## Mandatory Workflow

Always follow this sequence:

1. **Understand**
   - Read relevant files before making changes
   - Identify patterns and conventions
   - Understand data flow

2. **Plan**
   - Determine minimal set of changes
   - Identify affected files

3. **Execute**
   - Apply focused, minimal edits
   - Follow existing conventions strictly

4. **Validate**
   - Ensure TypeScript correctness
   - Check imports and dependencies
   - Avoid runtime errors

5. **Explain**
   - Summarize changes concisely
   - List modified files
   - Explain reasoning briefly

---

## Architecture Rules

### Server vs Client

- Default to **React Server Components**
- Only use `"use client"` when necessary:
  - state
  - effects
  - event handlers
  - browser APIs

- Never mix server and client logic incorrectly

---

## Folder Structure

- `app/` → routes
- `components/` → UI components
- `lib/` → utilities + integrations
- `hooks/` → custom hooks
- `types/` → shared types

---

## Supabase Rules (CRITICAL)

- Use Supabase for database and authentication
- Prefer **server-side Supabase usage**

### Security

- NEVER expose:
  - `SUPABASE_SERVICE_ROLE_KEY`
- Only use:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` in client
- Store secrets in `.env.local`

### Client Setup

- Use centralized clients:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `lib/supabase/admin.ts` (server-only)

Do NOT create duplicate clients.

---

## Database Usage

- Use typed queries when possible
- Avoid `.select("*")`
- Fetch only required fields
- Handle errors explicitly
- Use pagination for lists

---

## Styling Rules

- Use Tailwind CSS only
- No inline styles
- Follow existing design patterns
- Ensure responsive layout

---

## Accessibility

- Use semantic HTML
- Include alt text
- Ensure keyboard navigation
- Avoid unnecessary ARIA

---

## Code Quality

- Strict TypeScript (no `any`)
- Prefer explicit types
- Keep functions pure when possible
- Handle edge cases

---

## Performance

- Avoid unnecessary client components
- Minimize bundle size
- Prefer server rendering
- Use dynamic imports when needed

---

## Editing Rules

- Do NOT:
  - Rewrite entire files unnecessarily
  - Modify unrelated code
  - Introduce breaking changes

- Always:
  - Make minimal changes
  - Preserve structure
  - Follow naming conventions

---

## File Creation Rules

Create new files ONLY when:
- necessary for structure
- improves reuse or clarity

Place correctly:
- components → `components/`
- logic → `lib/`
- types → `types/`

---

## Dependencies

- Do NOT add dependencies unless necessary
- Prefer built-in solutions

---

## Communication Style

When responding:

- Be concise
- Focus on changes
- Avoid long explanations

Format:

- Files changed
- What was done
- Why

---

## Definition of Done

A task is complete when:

- TypeScript compiles
- No obvious runtime issues
- Matches project conventions
- Changes are minimal
- Code is production-ready

---

## Anti-Patterns to Avoid

- Overengineering
- Large refactors without request
- Mixing server/client logic
- Using `any`
- Adding unnecessary libraries

---

## Continuous Improvement

When you make a mistake, discover a missing project convention, or receive correction from the user:

1. Identify the lesson learned.
2. Suggest an update to the relevant instruction file:
   - `.github/copilot-instructions.md`
   - `AGENTS.md`
   - `CLAUDE.md`
3. Do NOT update instruction files automatically unless explicitly asked.
4. Keep improvements concise and specific.
5. Avoid adding one-off lessons that do not apply generally.

Suggested format:

- Problem:
- Lesson:
- Proposed instruction update:

---

## Goal

Act like a careful senior engineer working in a production environment.

Prioritize:
- correctness
- simplicity
- maintainability
- safety
