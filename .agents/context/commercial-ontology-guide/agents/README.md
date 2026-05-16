# Commercial Ontology Mapping — Agent Suite

## Architecture

```
Coordinator (claude-opus-4-7)
├── Phase 1: Entity Mapper (claude-sonnet-4-6) ── sequential
├── Phase 2: Architecture Mapper (claude-sonnet-4-6) ┐
├── Phase 3: Copy Grammar Mapper (claude-sonnet-4-6) ├── parallel
├── Phase 4: CRM Schema Mapper (claude-sonnet-4-6)  ┘
├── Phase 5: Compound Effects Mapper (claude-sonnet-4-6) ── sequential
└── Phase 6: Transition Cost Modeller (claude-sonnet-4-6) ── sequential
```

## Pipeline Orientation

This is a **discovery and mapping pipeline**, not an audit. The agents:

1. **Inventory** existing website content (crawl, collect, record what's there)
2. **Apply** the Commercial Ontology Framework as the organising layer
3. **Emit** structured, framework-relative outputs (entity maps, architecture maps, CRM schemas, etc.)

Agents do NOT judge, score compliance, or write remediation specs.

## Skills Architecture

```
skills/
├── ontology-extraction/    ← Entity classification rules
│   ├── SKILL.md
│   └── REFERENCE.md
├── architecture-audit/     ← Page-to-pillar mapping rules
│   ├── SKILL.md
│   └── REFERENCE.md
├── copy-grammar-audit/     ← Grammar classification rules
│   ├── SKILL.md
│   └── REFERENCE.md
├── crm-alignment-audit/    ← Entity-to-CRM field mapping rules
│   ├── SKILL.md
│   └── REFERENCE.md
├── compound-effects/       ← Enabling condition inventory rules
│   ├── SKILL.md
│   └── REFERENCE.md
└── cost-assessment/        ← Transition cost formulas
    ├── SKILL.md
    └── REFERENCE.md
```

## File Index

| File | Role |
|:---|:---|
| `00-coordinator.yaml/.json` | Opus coordinator — orchestrates all phases |
| `01-ontology-extractor.yaml/.json` | Phase 1 — crawls site, classifies entities |
| `02-architecture-auditor.yaml/.json` | Phase 2 — classifies pages by pillar |
| `03-copy-grammar-auditor.yaml/.json` | Phase 3 — classifies copy by grammar |
| `04-crm-alignment-auditor.yaml/.json` | Phase 4 — maps entities to CRM fields |
| `05-compound-effects.yaml/.json` | Phase 5 — inventories enabling conditions |
| `06-cost-assessor.yaml/.json` | Phase 6 — models transition costs |
| `agent_prompt.md` | Trigger playbook with prompt templates |
| `rubrics/full-audit-rubric.md` | Outcome criteria for coordinator |

## Output Manifest

All outputs go to `/mnt/user/outputs/`:

| File | Producer | Contents |
|:---|:---|:---|
| `01-entity-map.json` | Entity Mapper | Source names + framework names for all entities |
| `02-architecture-map.json` | Architecture Mapper | Page-to-pillar classification, entity placement |
| `03-copy-grammar-map.json` | Copy Grammar Mapper | H1 grammar types, compositions, tone mapping |
| `04-crm-mapping.json` | CRM Schema Mapper | Entity-to-field table, coordinates, campaign matrix |
| `05-compound-effects-map.json` | Compound Effects Mapper | Enabling conditions per category |
| `06-transition-costs.json` | Transition Cost Modeller | Hours, timeline, team requirements |
| `00-ontology-synthesis.md` | Coordinator | Executive summary of all maps |

## Deployment

See `agent_prompt.md` for full deployment and trigger instructions.

## Beta Headers Required

| Header | Purpose |
|:---|:---|
| `managed-agents-2026-04-01` | Managed Agents API |
| `skills-2025-10-02` | Skills functionality |
