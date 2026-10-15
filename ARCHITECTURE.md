# AgentMint Knowledgebase Architecture

`AgentMint Knowledgebase` definuje architekturu privátní Git-native
knowledgebase pro AgentMint ve Workspace GEN2.

## 1. Architectural role

Knowledgebase modul je:

- nejvyšší autorita pro privátní firemní know-how
- Git-native docs modul na Astro/Starlight stacku
- zdroj, ze kterého se mohou odvozovat interní wiki, veřejná dokumentace,
  web, prezentace nebo delivery materiály
- authoring i runtime vrstva pro privátní knowledge obsah

Knowledgebase modul není:

- veřejná dokumentace
- marketingový web
- Firestore nebo CMS datastore
- browser-editable backend mimo Git
- skladiště secrets, credentials nebo OAuth session dat

## 2. Source of truth

Kanonický source of truth pro knowledge page corpus je:

- `data/v2/docs/cs`
- `data/v2/docs/en`

To zahrnuje:

- markdown/MDX stránky
- frontmatter metadata
- lokalizované varianty
- obsahové slugy používané v navigaci

Kanonická navigace je:

- `data/v2/sidebar.ts`

Root repozitáře drží pouze governance a fork/template dokumenty:

- `README.md`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `TODO.md`
- `TEMPLATE.md`
- `CHANGELOG.md`

Tvrdé pravidlo: knowledge page má mít jen jednu kanonickou obsahovou cestu.
Nezakládej paralelní root markdown corpus vedle `data/v2/docs`.

## 3. Runtime model

`app/v2` je Astro/Starlight aplikace, která:

- renderuje privátní knowledgebase
- přes kontrolovaný data mount čte docs z `data/v2/docs`
- používá `data/v2/sidebar.ts` jako navigační autoritu
- drží jednoduchý metadata contract ve frontmatteru
- v dev režimu umí přes root `launchpad/components/editor/v2` spustit
  lokální editor pro `data/v2/docs` a `data/v2/sidebar.ts`

Runtime nesmí zavádět druhou authoring kopii mimo Git.
Listener autoritativně vlastní `lazurio.module.json`; runtime metadata v
`app/v2/package.json` odkazují na lease `main`. Přímý start čte stejný
manifest. Volitelné namespacované `LAZURIO_RUNTIME_*` hodnoty od Launchpadu
musí přesně souhlasit; obecné `HOST`, `PORT` ani `EDITOR_PORT` listener
nemění. Organization pool slouží pouze k přidělování budoucích lease a
zavedené app/editor porty automaticky nepřečísluje.

## 4. Metadata contract

Modul podporuje minimální metadata:

- `title`
- `description`
- `status`
- `owner`
- `last_verified`
- `confidence`
- `source_type`
- `source_paths`
- `aliases`

Metadata slouží pro rendering, vyhledávání, auditovatelnost a budoucí
indexaci. Nesmí z nich vzniknout samostatný databázový source of truth.

## 5. Information architecture

Výchozí struktura vychází z ověřeného GEN2 knowledgebase patternu:

1. `00-governance/` — pravidla authoringu, lifecycle a zdrojová mapa
2. `01-foundations/` — firma, slovník, mise, ekosystém
3. `02-product-and-ecosystem/` — produktový nebo servisní model
4. `03-technology-and-architecture/` — technické systémy a integrace
5. `04-delivery-and-operations/` — delivery, provoz, servis, procesy
6. `05-business-and-market/` — trh, zákazníci, positioning, pricing
7. `06-company-operating-system/` — role, tooling, cadence, source systems
8. `07-case-studies-and-media/` — reference, story assets, proof points
9. `08-roadmap-and-decisions/` — focus, decision log, otevřené otázky

AgentMint může sekce upravit podle vlastní reality, ale source-of-truth model
musí zůstat jednoduchý: Git source -> runtime/index/derived surfaces.

## 6. Invariants

- `data/v2/docs` je jediný kanonický page corpus.
- `data/v2/sidebar.ts` je navigační autorita.
- Root dokumenty jsou governance, ne knowledge pages.
- Derived artefakty jsou rebuildable z Git source.
- Secrets, účty platforem, raw exporty a cizí zákaznická data se do modulu
  nikdy nedávají.
- Při adaptaci z jiných firem se přenáší pattern, ne data ani strategie.
- `migrations/v2` zůstává verzovaný, aby starší fork mohl bezpečně převést v1
  data, vytvořit retirement record a ověřit jediný aktivní target v2.
