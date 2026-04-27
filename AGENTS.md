<!-- BEGIN:nextjs-agent-rules -->
# Agent Instructions

You are acting as an autonomous coding agent in this repository.

Your goal is to make **correct, minimal, and production-ready changes** while respecting the existing codebase.

---

## 1. Core Behavior

- Always understand the **existing structure and patterns** before making changes
- Make the **smallest possible change** that solves the task
- Prefer **editing existing files** over creating new ones
- Do NOT refactor unrelated code
- Do NOT introduce breaking changes unless explicitly requested

---

## 2. Project Context

This is a **Next.js application** using:

- App Router (`app/`)
- TypeScript (strict)
- React Server Components by default
- Tailwind CSS

Follow these rules strictly:
- Prefer **server components**
- Only use `"use client"` when necessary
- Keep components small and composable

---

## 3. Workflow (MANDATORY)

Follow this exact sequence:

### Step 1 — Understand
- Identify relevant files
- Read surrounding code before editing
- Understand data flow and dependencies

### Step 2 — Plan
- List which files will be changed
- Describe changes briefly (internally)

### Step 3 — Execute
- Apply minimal, targeted edits
- Follow project conventions exactly

### Step 4 — Validate
- Ensure TypeScript correctness
- Ensure no obvious runtime issues
- Ensure imports and paths are correct

### Step 5 — Explain
- Summarize changes briefly
- List modified files
- Explain reasoning in simple terms

---

## 4. Editing Rules

- Do NOT:
  - Rewrite entire files unnecessarily
  - Rename files without reason
  - Change public APIs silently

- Always:
  - Preserve formatting and style
  - Reuse existing utilities
  - Follow naming conventions

---

## 5. File Creation Rules

Only create new files if:
- The feature clearly requires it
- It improves structure or reuse

When creating files:
- Place them in the correct directory:
  - `components/`
  - `lib/`
  - `hooks/`
  - `types/`
- Use consistent naming

---

## 6. UI & Styling

- Use Tailwind CSS only
- Follow existing UI patterns
- Ensure:
  - responsiveness
  - accessibility
  - clean layout

Avoid:
- Inline styles
- Duplicated UI logic

---

## 7. Data & Logic

- Prefer server-side logic
- Avoid unnecessary client-side state
- Use async/await cleanly
- Handle edge cases

---

## 8. Safety Constraints

- Never delete code unless necessary
- Never modify unrelated logic
- Never introduce secrets or credentials
- Never install dependencies without justification

---

## 9. Performance Awareness

- Avoid unnecessary re-renders
- Avoid large client bundles
- Prefer server rendering
- Use dynamic imports when appropriate

---

## 10. Communication Style

When responding:

- Be concise
- Focus on what changed
- Avoid long explanations
- Provide actionable summaries

Format:

- Files changed:
  - `path/to/file.tsx`
- What was done:
  - Short explanation
- Why:
  - Reason for change

---

## 11. Definition of Done

A task is complete when:

- Code compiles (TypeScript safe)
- No obvious runtime errors
- Follows project conventions
- Changes are minimal and precise
- Output is production-ready

---

## 12. Anti-Patterns to Avoid

- Overengineering solutions
- Large refactors without request
- Introducing new patterns unnecessarily
- Ignoring existing architecture
- Mixing server/client logic incorrectly

---

##  13. Supabase Agent Rules

When working with Supabase:

- Inspect existing Supabase setup before creating new clients
- Do not duplicate Supabase client initialization
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- Never place secrets in committed files
- Use server-side access by default
- Use client-side Supabase only when the UI needs live user interaction
- Respect Row Level Security policies
- Handle Supabase errors explicitly
- Keep database types in sync with Supabase schema

Preferred files:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `types/database.ts`

Before finishing Supabase-related changes:
- Check environment variable usage
- Check client/server boundaries
- Check that no secrets are exposed
- Mention any required RLS policies or migrations

---

## 14. Continuous Improvement

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

Act like a senior engineer making careful, minimal, high-quality changes to a production Next.js codebase.
<!-- END:nextjs-agent-rules -->
