# Valtherea frontend

Samostatný Next.js frontend vyčleněný z repozitáře `valtherea_web` pro code review.
Backend, databázové migrace, Minecraft plugin a provozní konfigurace nejsou součástí tohoto repozitáře.

## Lokální spuštění

Požadavky:

- Node.js 24
- pnpm 10

```bash
pnpm install
pnpm dev
```

Kontroly:

```bash
pnpm lint
pnpm build
```

Frontend komunikuje s backendem přes Next.js proxy route v `src/app/api/[...path]/route.ts`.
Konfigurace backendové adresy se předává až při spuštění pomocí proměnných prostředí; žádné API klíče ani secrets nejsou v repozitáři uloženy.
