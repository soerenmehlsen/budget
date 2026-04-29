# Budget App

En moderne budgettyring-applikation bygget med Next.js og Supabase.

## Om projektet

Budget App er en web-baseret applikation til at administrere og overvåge udgifter. Appen giver brugerne mulighed for at registrere udgifter, se deres budget-status og få indsigt i deres økonomiske vaner.

## Tech Stack

- **Frontend:** [Next.js 16](https://nextjs.org) + React 19
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **Icons:** [Lucide React](https://lucide.dev)
- **Database & Auth:** [Supabase](https://supabase.com)
- **Sprog:** TypeScript
- **Development Tools:** ESLint, Prettier

## Installation

### Forudsætninger

- Node.js 18+
- npm eller yarn

### Setup

1. Klon projektet:
```bash
git clone <repository-url>
cd budget
```

2. Installer afhængigheder:
```bash
npm install
```

3. Konfigurer miljøvariabler (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Kør udviklingserveren:
```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) i din browser.

## Kommandoer

- `npm run dev` - Start udviklings-serveren
- `npm run build` - Build produktionsversion
- `npm start` - Start produktionsserveren
- `npm run lint` - Kør ESLint

## Projektstruktur

```
├── app/                      # Next.js App Router
│   ├── page.tsx             # Login-side (startside)
│   ├── layout.tsx           # Root layout
│   ├── dashboard/           # Dashboard-side
│   ├── expenses/            # Udgifter-administrasjon
│   ├── income/              # Indkomst-administration
│   └── reset-password/      # Nulstil adgangskode
├── components/              # Reusable React komponenter
│   ├── login-panel.tsx      # Login-formular
│   ├── reset-password-panel.tsx
│   └── bottom-nav.tsx       # Navigation
├── lib/
│   └── supabase/            # Supabase konfiguration
│       └── client.ts        # Supabase klient
├── public/                  # Statiske filer
└── tsconfig.json           # TypeScript config
```

## Features

- ✅ Bruger-autentificering (login/logout)
- ✅ Adgangskode-nulstilling
- ✅ Dashboard med budget-oversigt
- ✅ Registrering af udgifter
- ✅ Registrering, redigering og sletning af indkomstkilder
- ✅ Mobil-venligt design
- ✅ Dark mode UI
- ✅ Lucide React icons

## Udvikling

### Komponenter

Projektet bruger React Server Components som standard. Client-komponenter markereres med `"use client"`.

### Styling

Alle stilarter bruger Tailwind CSS utility classes. Ingen CSS-moduler eller inline styles.

### Database

Supabase bruges til databaseadgang og autentificering. Alle brugerspesifikke data beskyttes med Row Level Security (RLS).

## Miljøvariabler

Krævet i `.env.local`:

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Din Supabase projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Din Supabase anon API-nøgle |

## Deployment

Projektet kan nemt deployes på [Vercel](https://vercel.com):

1. Push til GitHub
2. Forbind repository til Vercel
3. Tilføj miljøvariabler i Vercel dashboard
4. Deploy!

## Licens

Privat projekt.
