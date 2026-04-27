You are working on a modern Next.js application.

## Core Stack
- Next.js (App Router)
- TypeScript (strict mode)
- React Server Components by default
- Tailwind CSS
- ESLint + Prettier

---

## Architecture Principles

- Prefer **server components** unless interactivity is required
- Use **client components only** when needed:
  - state (useState, useReducer)
  - effects (useEffect)
  - browser APIs
  - event handlers

- Keep components:
  - small
  - reusable
  - composable

- Co-locate logic when it improves clarity

---

## Folder & File Conventions

- `app/` → routes (App Router)
- `components/` → reusable UI components
- `lib/` → utilities, helpers, API logic
- `hooks/` → custom React hooks
- `types/` → shared TypeScript types

Naming:
- Components → PascalCase
- Functions/variables → camelCase
- Files → kebab-case or match component name

---

## Data Fetching

- Prefer server-side data fetching
- Use async/await directly in server components
- Avoid unnecessary client-side fetching
- Cache when appropriate using Next.js features

---

## Styling

- Use Tailwind CSS only
- Prefer utility classes over custom CSS
- Extract reusable UI patterns into components
- Ensure responsive design (mobile-first)

---

## Accessibility

- Use semantic HTML
- Add alt text for images
- Ensure keyboard accessibility
- Use proper ARIA attributes only when necessary

---

## Performance

- Avoid unnecessary re-renders
- Avoid large client bundles
- Use dynamic imports when beneficial
- Prefer server rendering over client rendering

---

## Code Quality

- Use strict TypeScript types (avoid `any`)
- Prefer explicit types when helpful
- Keep functions pure when possible
- Handle edge cases

---

## Dependencies

- Avoid adding new dependencies unless necessary
- Prefer built-in or existing utilities

---

## When Generating Code

Always:
1. Match the existing project structure
2. Follow naming conventions
3. Keep changes minimal and focused
4. Write clean, production-ready code
5. Avoid over-engineering

---

## When Editing Code

- Do NOT rewrite unrelated files
- Do NOT introduce breaking changes without reason
- Preserve existing patterns unless improving them

---

## Output Expectations

When suggesting changes:
- Explain briefly what was changed and why
- List affected files
- Keep explanations short and practical

---

## Testing & Validation

Before finishing, ensure:
- TypeScript compiles
- No obvious runtime errors
- Code follows linting rules

---

## UI Guidelines

- Clean and minimal design
- Consistent spacing
- Use Tailwind spacing scale
- Avoid inline styles
- Prefer composition over duplication

---

## Anti-Patterns to Avoid

- Overusing client components
- Using `any` in TypeScript
- Deep prop drilling (use composition instead)
- Large monolithic components
- Adding unnecessary libraries

---

## Goal

Generate production-ready, maintainable, and idiomatic Next.js code that aligns with modern best practices.

## Supabase

This project uses Supabase for database, authentication, and server-side data access.

Rules:
- Use `@supabase/supabase-js`
- Prefer server-side Supabase access in Server Components, Server Actions, or Route Handlers
- Never expose service role keys to the client
- Use anon/public keys only in client-safe contexts
- Store secrets in `.env.local`
- Validate environment variables before use
- Use Row Level Security (RLS) for all user-owned data
- Never bypass RLS unless explicitly required on the server with a service role key
- Keep Supabase client setup centralized in `lib/supabase/`

Recommended structure:
- `lib/supabase/client.ts` → browser client
- `lib/supabase/server.ts` → server client
- `lib/supabase/admin.ts` → service-role admin client, server-only
- `types/database.ts` → generated Supabase database types

When writing queries:
- Use typed Supabase clients when possible
- Handle errors explicitly
- Avoid loading more columns than needed
- Prefer `.select("id, name, created_at")` over `.select("*")`
- Add pagination for lists