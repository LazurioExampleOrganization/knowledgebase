# AgentMint Knowledgebase — instrukce pro agenty

Tento repozitář je trvalá znalostní vrstva AgentMintu. Platí pro celý scope
`AgentMint/modules/knowledgebase/` a doplňuje root pravidla workspace.

## Role repozitáře

- `modules/knowledgebase/` drží strategii, guardrails, lessons learned,
  rozhodovací logiku a stabilní slovník AgentMintu.
- Modul je upstream-compatible fork
  upstream Lazurio knowledgebase šablony; lokální remote `upstream`
  slouží pro budoucí přenos obecných vylepšení šablony.
- Do modulu patří až zobecněná znalost. Surové zdroje, longlisty a mechanism
  scans patří do `modules/research/`.
- Experiment specs, run logy, metriky a stop/scale rozhodnutí patří do
  `modules/experiments/`; sem přenes až lesson learned.
- Nepřenášej cizí data, placený obsah, secrets, účty platforem ani identitu
  jiných firem.

## Povinné čtení pro větší práci

- `README.md`
- `ARCHITECTURE.md`
- `TODO.md`
- `TEMPLATE.md`

Za větší práci se považuje hlavně změna source-of-truth hranic, změna
metadata contractu, změna navigační hierarchie nebo změna runtime stacku.

## Source of truth

Kanonické knowledge stránky žijí v:

- `data/v2/docs/cs`
- `data/v2/docs/en`

Kanonická navigace žije v:

- `data/v2/sidebar.ts`

Root dokumenty (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `TODO.md`,
`TEMPLATE.md`) jsou governance dokumenty o modulu a původu ve šabloně.
Nepoužívej je jako druhý obsahový corpus knowledgebase.

## Pracovní pravidla

- Nové stránky přidávej pouze do `data/v2/docs`.
- Sidebar udržuj ručně v `data/v2/sidebar.ts`.
- `app/v1` ani `editor/v1` neobnovuj. Při synchronizaci staršího forku použij
  verzované nástroje v `migrations/v2/` a zachovej retirement record.
- Pokud změníš source-of-truth hranice, uprav zároveň `ARCHITECTURE.md` a
  `TODO.md`.
- V dokumentech nepoužívej machine-local absolutní cesty jako `/Users/...`.
- Každé pravidlo formuluj jako vlastní AgentMint princip, ne jako opsanou
  strategii jiné firmy.
- Pokud poznatek vznikl z konkrétního experimentu nebo research sprintu,
  odkazuj na jeho evidenci.
- Při přenosu změn z `upstream` nepřepisuj AgentMint obsah zpět na obecnou
  šablonu.

## Ověření

Po změně runtime nebo docs struktury ověř:

```bash
cd app/v2
bun install
bun test
bun run check
bun run build
```

Pokud testy nejdou spustit, napiš do předání přesný důvod.
