> ⚠ **Scope: WEBSITE CONTENT taxonomy only — this is not the CRM commercial model.**
> Where this file says "commercial ontology" it means the website content grammar in
> `.agents/context/commercial-ontology-guide/`. Zoho CRM semantics are governed by
> `zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`.

---

# Rule: Content and Ontology Strictness

**When generating or evaluating content, you must adhere to these rules:**

1. **Load Skills**: Always load and apply the constraints from `.agents/skills/writing/SKILL.md` and `.agents/skills/web-design/SKILL.md`.
2. **Commercial Ontology Strictness**: You must strictly follow the grammatical definitions in `.agents/context/commercial-ontology-guide/01-ontology-and-grammar.md`.
3. **Four Pillars**: Content must be strictly categorised into the Four Pillars (Products, Features, Solutions, Use Cases) as defined by the commercial ontology guide.
4. **No Compound Phrases**: Never conflate a Feature and a Solution into a compound phrase (e.g., "Lead Scoring"). Keep them separated atomically.
5. **No SaaS Filler**: Prohibit generic SaaS language ("leverage", "seamless", "synergy"). Rely exclusively on the specific commercial tone defined in the brand guide and writing skill.
6. **No AI Superlatives**: Banish "revolutionary", "game-changing", "transformative", or "next-generation".
7. **Consistent Cross-Linking**: Ensure that the relational graph is respected. Features must link to their parent Products, and Solutions must link to the Features they operate on.
