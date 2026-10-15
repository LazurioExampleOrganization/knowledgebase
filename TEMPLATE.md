# AgentMint Knowledgebase fork notes

Tento soubor zůstává jako stopa po původu z `KnowledgebaseTemplate` a jako
checklist při budoucí synchronizaci upstream změn.

## Stav inicializace

- [x] Identita přepsaná na AgentMint.
- [x] `site` nastavený pro lokální/private knowledgebase adresu.
- [x] `name` v `app/v2/package.json` nastavený na
  `agentmint-knowledgebase-v2`.
- [x] Root `README.md`, `AGENTS.md`, `ARCHITECTURE.md` a `TODO.md`
  přepsané pro AgentMint.

## Jazykový model

Modul zatím drží češtinu i angličtinu:

- `cs` jako default locale
- `en` jako druhý locale

Čeština je provozní jazyk AgentMintu. Angličtinu ponecháváme pro budoucí
publikovatelné nebo mezinárodní knowledge povrchy.

## Co plnit jako první

Začni sekcí `00-governance`:

- kdo smí do knowledgebase zapisovat
- jak se ověřuje pravdivost stránek
- jak se rozlišuje draft, review a canonical obsah
- které zdroje se ingestují a které jsou jen derived

Potom vyplň `01-foundations`:

Teprve potom vyplň:

- company at a glance
- glossary and aliases
- mission, vision, positioning
- ecosystem map

Bez těchto základů se špatně odvozují web, dokumentace, prezentace i agentní
chování.

## Ověření runtime

```bash
cd app/v2
bun install
bun test
bun run check
bun run build
```

## Bezpečnost

Do nové knowledgebase necommituj:

- secrets, tokeny, `.env.local`
- OAuth session data
- neveřejná klientská data bez jasné access boundary
- osobní overlaye lidí
- raw exporty bez kontroly obsahu
