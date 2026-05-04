
# CLAUDE.md

You are working in a production-grade Next.js application.
Act as a **senior software engineer** — careful, minimal, and correct.

---

## Core Stack

- Next.js (App Router)
- TypeScript (strict)
- React Server Components by default
- Tailwind CSS + Lucide React
- Supabase (database + auth)

---

## Mandatory Workflow

1. **Understand** — read relevant files, identify patterns and data flow
2. **Plan** — determine minimal set of changes and affected files
3. **Execute** — apply focused edits, follow existing conventions
4. **Validate** — TypeScript correctness, imports, no runtime errors
5. **Explain** — files changed, what was done, why (be concise)

---

## Server vs Client Components

Default to **Server Components**. Only add `"use client"` when needed:
- `useState`, `useEffect`, or other hooks
- Event handlers (`onClick`, `onChange` osv.)
- Browser APIs (`window`, `localStorage` osv.)

**Pattern — split data fetching from interactivity:**
```tsx
// Server Component henter data
async function ProductPage({ params }) {
  const product = await productService.getProduct(params.id);
  return <AddToCart productId={product.id} />; // Client Component
}
```

**Children-mønsteret** — undgå at gøre server components til client unødvendigt:
```tsx
// ✅ Send som children så de forbliver server components
"use client";
export function Wrapper({ children }) {
  return <div onClick={...}>{children}</div>;
}
```

**Props fra server → client skal være serialiserbare** (ingen funktioner, class-instanser).

---

## Folder Structure

```
app/           → routes (page.tsx, layout.tsx, loading.tsx, error.tsx, route.ts)
components/
  ui/          → primitive komponenter (Button, Input)
  features/    → feature-specifikke komponenter
hooks/         → custom hooks (prefix: use*)
services/      → al ekstern kommunikation og API-kald
lib/           → utilities, db, auth, konfiguration
types/         → delte TypeScript typer
```

**Routing-filer med særlig betydning:**

| Fil | Formål |
|---|---|
| `page.tsx` | Synlig side |
| `layout.tsx` | Delt layout (bevarer state) |
| `loading.tsx` | Automatisk Suspense-fallback |
| `error.tsx` | Fejlgrænse (`"use client"` påkrævet) |
| `route.ts` | API-endpoint |

---

## Clean Code

- **Navngivning:** Komponenter `PascalCase`, hooks `useCamelCase`, konstanter `SCREAMING_SNAKE_CASE`
- **Single Responsibility:** én komponent = ét ansvar, hold under ~150 linjer
- **Ingen magiske værdier:** brug navngivne konstanter
- **Strict TypeScript:** ingen `any`, brug eksplicitte typer og interfaces

---

## Lav Kobling

**Injicér logik via props** fremfor hardcodede imports:
```tsx
// ❌ Høj kobling
import { stripeService } from "@/services/stripeService";
function CheckoutButton({ amount }) {
  return <button onClick={() => stripeService.pay(amount)}>Betal</button>;
}

// ✅ Lav kobling
function CheckoutButton({ amount, onPay }) {
  return <button onClick={() => onPay(amount)}>Betal</button>;
}
```

**Komposition over konfiguration** — brug `children` og compound components fremfor lange prop-lister.

**Undgå prop drilling** — brug React Context eller en state manager.

---

## Data Fetching & Service-lag

Al kommunikation med API'er skal ligge i `services/` — aldrig direkte i komponenter:
```tsx
// services/productService.ts
export async function getProducts(category: string) {
  const res = await fetch(`${BASE_URL}/products?category=${category}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Kunne ikke hente produkter");
  return res.json() as Promise<Product[]>;
}
```

**Server Actions** til mutations fremfor API-routes:
```tsx
"use server";
export async function addToCart(productId: string) {
  await db.cart.add({ productId, userId: getCurrentUser().id });
  revalidatePath("/cart");
}
```

---

## Custom Hooks

Udpak logik fra komponenter — hooks kobler logik fra UI:
```tsx
// ✅ Logik i hook, komponent er ren
function useProductSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => { /* fetch logik */ }, [query]);
  return { query, setQuery, results, loading };
}
```

---

## Supabase (CRITICAL)

- Foretræk **server-side** Supabase-kald
- Brug centraliserede klienter: `lib/supabase/client.ts`, `server.ts`, `admin.ts`
- **Eksponér ALDRIG** `SUPABASE_SERVICE_ROLE_KEY`
- Brug kun `NEXT_PUBLIC_SUPABASE_ANON_KEY` i client
- Undgå `.select("*")` — hent kun nødvendige felter
- Håndtér fejl eksplicit, brug pagination på lister

---

## Styling & Ikoner

- **Tailwind CSS only** — ingen inline styles
- **Lucide React** til alle ikoner — aldrig inline SVG:
  ```tsx
  import { Plus } from "lucide-react";
  <Plus size={20} strokeWidth={2} />
  ```

---

## Environment Variables

```bash
DATABASE_URL=...              # Server-only
SUPABASE_SERVICE_ROLE_KEY=... # Server-only — eksponér ALDRIG
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # Client-safe
NEXT_PUBLIC_API_URL=...       # Client-safe
```

Validér server-side variabler ved opstart i `lib/env.ts`.

---

## Performance

- Undgå unødvendige client components
- Brug `next/image` og `next/font` — aldrig `<img>`
- Brug `dynamic()` til tunge komponenter der ikke behøver SSR

---

## SEO & Metadata

```tsx
// Statisk
export const metadata: Metadata = { title: { default: "App", template: "%s | App" } };

// Dynamisk
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return { title: post.title, description: post.excerpt };
}
```

---

## Editing Rules

- **Lav IKKE:** unødvendige rewrites, ændringer i urelateret kode, breaking changes
- **Lav altid:** minimale ændringer, bevar struktur og navnekonventioner
- **Tilføj IKKE** nye dependencies medmindre nødvendigt

---

## Continuous Improvement

Ved fejl eller manglende konvention:
1. Identificér læringen
2. Foreslå opdatering til `CLAUDE.md` — men opdatér **ikke** automatisk
3. Brug format: **Problem / Lesson / Proposed update**

---

## Definition of Done

- TypeScript kompilerer uden fejl
- Ingen åbenlyse runtime-fejl
- Matcher projektkonventioner
- Ændringer er minimale og production-ready
