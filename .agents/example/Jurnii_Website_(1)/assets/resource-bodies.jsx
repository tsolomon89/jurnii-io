// Resource article body content — keyed by slug
window.RESOURCE_BODIES = {
  'jurnii-vs-ekimetrics': {
    tldr: ['Ekimetrics is a serious, established MMM consultancy with strong cross-sector pedigree.','Their model isn\'t built around iGaming-specific drivers (bonus mechanics, sporting calendars, regulatory shocks).','For operators where those drivers materially move the P&L, that gap shows up in coefficients you can\'t defend in a board meeting.','Jurnii MMM was built iGaming-first; Ekimetrics is sector-agnostic.'],
    sections: [
      { h: 'The honest picture', p: ['Ekimetrics is a credible, well-resourced consultancy. Their analysts are sharp, their methodology is rigorous, and their decks are immaculate. If you\'re an FMCG brand, a retailer, or a financial services player with a clean spend taxonomy, you\'ll get a useful model.','We\'ve reviewed their iGaming work — including a deployment we were called in to triage. The core regression worked. The problem wasn\'t technical. It was contextual.'] },
      { h: 'Where the iGaming gap opens', p: ['Three places, consistently:','First, bonus mechanics. In a generic MMM, "promotional spend" is one variable. In iGaming, the difference between a £10 free bet at 5× wagering and a £20 bonus at 35× wagering is the difference between profit and loss. Treating them as the same input loses signal.','Second, the sporting calendar. Cheltenham, the Grand National, the Six Nations, the World Cup — these aren\'t noise. They\'re structural. A model that doesn\'t decompose them treats them as either a windfall or an outlier.','Third, regulatory shocks. The Belgian ad ban, the Dutch deposit limits, the UK affordability checks. These are exogenous, time-stamped, and need to be modelled as such — not absorbed into the residual.'] },
      { h: 'Where Ekimetrics still wins', p: ['Cross-sector benchmarking. If you\'re a multi-vertical group with iGaming as one line, Ekimetrics gives you a single methodology across everything.','Brand-equity modelling. Their long-term brand work is excellent — better than ours, candidly.','And, frankly, board-room comfort. They\'ve been around a long time, and that matters in some procurement processes.'] },
      { h: 'The decision', p: ['If iGaming is your business — not one of three or four lines — Jurnii MMM gives you a model that understands the drivers. If iGaming is one of several, Ekimetrics may give you the cross-sector view you need.','Either way, a competent operator should run a data-readiness assessment before signing anything. We do ours free; theirs is part of scoping.'] },
    ],
    related: ['mmm-data-readiness-igaming','jurnii-vs-nielsen','tier-1-operator-promo-waste-reduction'],
  },
  'jurnii-vs-nielsen': {
    tldr: ['Nielsen MMM is the FMCG gold standard. Decades of pedigree, panel data, and credibility.','iGaming variables (bonus mechanics, sporting calendars, regulatory shocks, competitor promo intensity) are not in their core model.','For operators, that means coefficients on TV and digital that look fine in isolation but don\'t add up to a defensible P&L explanation.','Jurnii MMM models those variables as first-class inputs.'],
    sections: [
      { h: 'Why Nielsen exists', p: ['Nielsen MMM grew up in FMCG. The unit economics there are: a shopper buys a product at a retail price, you have a manufacturer-suggested price, you have promotion depth, and you have media spend. The model fits beautifully.','iGaming isn\'t that.'] },
      { h: 'The structural mismatch', p: ['In iGaming, there is no "shelf price." The product changes daily — through odds, boosts, free bets, reload offers, missions. Spend granularity matters in a way Nielsen\'s panel-based methodology doesn\'t naturally accommodate.','We\'ve seen Nielsen models for operators with R² values that look defensible until you ask the model to explain a Cheltenham week — at which point the residuals double.'] },
      { h: 'Where Nielsen still adds value', p: ['Long-term brand-tracking. Their panel data is genuinely unique.','TV attribution at scale, especially for operators running broadcast across multiple territories.','And procurement comfort, which we won\'t pretend isn\'t real.'] },
      { h: 'When to choose Jurnii', p: ['When the questions you\'re asking are: "Is paid social saturated?" "Should we cut reload offers?" "What\'s the marginal ROI on the next pound into TV during Cheltenham?" — these are the questions Jurnii MMM was built to answer.'] },
    ],
    related: ['mmm-data-readiness-igaming','jurnii-vs-ekimetrics','igaming-intelligence-trends-2026'],
  },
  'jurnii-vs-ux-agencies': {
    tldr: ['UX agencies do qualitative work brilliantly — and slowly.','They don\'t scale. They don\'t re-score quarterly. They don\'t carry direct NGR weight in their findings.','Jurnii UX is structured benchmarking with peer comparison, quarterly cadence, and impact-weighted findings.','We don\'t replace agencies — we replace the part of the agency engagement that should be a system, not a project.'],
    sections: [
      { h: 'What agencies do well', p: ['Generative research. Player interviews. Diary studies. Co-design workshops. None of that is what Jurnii UX does, and you should keep doing it.','Hero work. Big redesigns. Brand re-platformings. Agencies — good ones — are still the right partner for that.'] },
      { h: 'What agencies do badly', p: ['Speed. A typical agency UX audit takes 8–12 weeks. By the time it lands, two of the five "top friction points" have been addressed by the product team in the meantime, and the report is stale.','Scale. Agencies score one operator deeply. They don\'t benchmark you against five peers on the same 60+ criteria — because that\'s six audits, not one, and no one wants to pay for that.','Comparability across time. Audit findings rarely re-scored quarterly with the same rubric. So you can\'t see if you\'ve actually improved.'] },
      { h: 'How Jurnii UX fits', p: ['Quarterly. Same rubric. Same peer set. Same journeys. Findings tagged by NGR-weighted impact and effort.','It\'s not a replacement for design thinking. It\'s a replacement for "we paid £80k for a slide deck six months ago and no one\'s opened it since."'] },
    ],
    related: ['experience-is-the-new-battleground','tier-1-operator-promo-waste-reduction','how-to-run-ux-audit-igaming'],
  },
  'jurnii-vs-manual-tracking': {
    tldr: ['Two analysts, three spreadsheets, and a quarterly report.','Loaded cost: £180k–£260k/year, before opportunity cost.','Coverage: lower than you think — partial competitor set, partial markets, weekly cadence at best.','Jurnii 360 is more coverage, daily cadence, structured database, and integration — for less than a single analyst loaded.'],
    sections: [
      { h: 'How operators do this in-house', p: ['It almost always starts the same way: one analyst, one spreadsheet, weekly screenshots of the top three competitors.','Within a year, that\'s a team of two. By year three, it\'s a team of three plus a Power BI dashboard.','It also means six ongoing pain points: scope creep, holiday coverage, screenshot reliability, taxonomy drift, dashboard maintenance, and the inevitable "we missed that promotion" Monday morning.'] },
      { h: 'The honest cost', p: ['Two analysts at £55k loaded — £110k.','Tooling and ad-hoc subscriptions — £20k.','Manager time at 15% — £18k.','Total: ~£150k–£180k for a partial, weekly view of a 5–8 brand competitor set.','For 20 brands daily, you triple it.'] },
      { h: 'What you actually want', p: ['Daily structured capture. Change alerts. A historical database. An API into your warehouse. Not a spreadsheet.','That\'s the product. We didn\'t invent a new category — we just productised what the smart operator was building anyway.'] },
    ],
    related: ['cheltenham-2026-promotional-intelligence','how-to-build-promo-intelligence-framework','tier-1-operator-promo-waste-reduction'],
  },
  'how-to-build-promo-intelligence-framework': {
    tldr: ['Most operators have promo intelligence as a process, not a system.','Seven steps, in order: scope, schema, capture cadence, change detection, scoring, surfacing, review.','Each step has a failure mode. We\'ve hit all of them.'],
    sections: [
      { h: 'Step 1 — Define the competitor set', p: ['Not "the top 10 operators." Define them by what you actually compete for. Same player segment, same vertical, same regulatory regime. Five to ten brands, named, agreed.','Failure mode: a "top 20" list nobody actually believes, that gets quietly de-scoped six months in.'] },
      { h: 'Step 2 — Define the schema', p: ['Every offer captured needs the same structured fields: type, headline value, mechanic, wagering, qualifying odds, eligibility window, channel observed, segment.','Failure mode: free-text capture. You will not be able to compare anything in six months.'] },
      { h: 'Step 3 — Set the cadence', p: ['Daily, full-coverage. Anything less and you miss launches by definition.','Failure mode: weekly. Acceptable until the week a competitor launches a one-week-only £100 free bet for a major event and you find out on Twitter.'] },
      { h: 'Step 4 — Build change detection', p: ['Not "did the page change" — "did the structured field change." Diff at the schema level.','Failure mode: page-diff alerting. You\'ll get 200 alerts a day and read none of them by week three.'] },
      { h: 'Step 5 — Score every offer', p: ['A composite richness index that normalises across mechanics. So a £50 free bet and a £20 bonus + £10 free spins are comparable on a single number.','Failure mode: "headline value" only. You\'re a pricing analyst now, congratulations.'] },
      { h: 'Step 6 — Surface to the right people', p: ['Trading sees price boosts. CRM sees reload mechanics. Product sees site-section placement changes.','Failure mode: a single weekly digest emailed to a distribution list. Nobody reads it.'] },
      { h: 'Step 7 — Review weekly, recalibrate quarterly', p: ['Weekly: did we react to anything? Quarterly: are we capturing the right brands, the right markets, the right schema?','Failure mode: never reviewing. The system rots quietly.'] },
    ],
    related: ['jurnii-vs-manual-tracking','cheltenham-2026-promotional-intelligence','tier-1-operator-promo-waste-reduction'],
  },
  'how-to-run-ux-audit-igaming': {
    tldr: ['Five journeys to score: registration, deposit, first bet, casino-to-sport crossover, withdrawal.','Each on iOS, Android, mobile web, desktop web.','60+ criteria per journey, weighted by NGR impact.','Half-day calibration with product before findings go to leadership.'],
    sections: [
      { h: 'The five journeys', p: ['Registration — measured from landing to first credential commit. Average industry time-to-completion is 4m 12s; the leaders are under 2m.','Deposit — measured from intent to confirmation. The 25%–75% range across our peer set is wider than any other journey, which means there\'s the most room to win.','First bet — measured from deposit to bet placed. Casino is faster than sportsbook by ~38% on average.','Casino-to-sport crossover — under-measured industry-wide. Most operators score below 35/100 on it.','Withdrawal — the journey operators don\'t want to score, and that players talk about most.'] },
      { h: 'The criteria', p: ['Per journey, 60+ criteria across: clarity of progress, error recovery, accessibility, regulatory friction, value framing, performance, defensive design, and consistency across platforms.','Each scored 0–4 with a defined rubric. Not a vibe.'] },
      { h: 'The weighting', p: ['Multiply each score by an NGR-impact weight derived from your funnel data. The result is a prioritised list — not "fix everything", but "fix this first because it\'s worth £X."'] },
      { h: 'The calibration', p: ['Before findings go to leadership, sit with product for half a day. Walk through every flagged criterion. Some will be deliberate trade-offs (regulatory, brand, technical). Mark them, don\'t remove them.','The result lands without surprises.'] },
    ],
    related: ['experience-is-the-new-battleground','jurnii-vs-ux-agencies','igaming-intelligence-trends-2026'],
  },
  'mmm-data-readiness-igaming': {
    tldr: ['12 checks. Most operators fail 2–3 on the first pass.','Failures are fixable, but they take 4–8 weeks of effort before MMM is sensible.','Run this assessment before signing any MMM contract — ours or anyone else\'s.'],
    sections: [
      { h: 'The 12 checks', p: ['1. 24+ months of clean spend by channel and campaign.','2. Daily or weekly granularity on KPI data (FTDs, deposits, NGR).','3. Channel taxonomy that hasn\'t changed in the last 18 months without a mapping table.','4. Bonus spend separated from media spend.','5. CRM-sourced revenue separated from acquisition-sourced revenue.','6. A documented event calendar (sporting, marketing campaigns, product launches).','7. Documented regulatory events with start dates.','8. A workable definition of "active player" that hasn\'t silently changed.','9. Affiliate spend at a per-affiliate level, not an aggregate line.','10. TV / OOH spend by region and week, not just monthly aggregate.','11. Discounting / boost spend tracked separately from bonus spend.','12. A single point of truth for finance-reconciled spend (not the marketing system\'s "best estimate").'] },
      { h: 'What fails most often', p: ['Checks 4, 5, and 8. Bonus and media commingled, CRM and acquisition commingled, "active player" definition that drifted three times in 18 months.','None of these are fatal. All of them are 4–8 weeks of clean-up work before a model is worth building.'] },
    ],
    related: ['jurnii-vs-ekimetrics','jurnii-vs-nielsen','igaming-intelligence-trends-2026'],
  },
  'cheltenham-2026-promotional-intelligence': {
    tldr: ['850+ promotions tracked across 20+ operators across the four festival days.','Average headline-value increase vs Cheltenham 2025: +14%.','Average wagering-requirement reduction: -1.4× (i.e. less player-friendly variance, not more).','Three operators ran promotions that lost money on a unit-economics basis. We name them in the full report.'],
    sections: [
      { h: 'The market context', p: ['2026 was the most promotionally aggressive Cheltenham we\'ve tracked, by every measure. Headline values up. Frequency up. Mechanic complexity up. Margin discipline down.','That\'s a pattern that doesn\'t end well, and it\'s why we\'re publishing this.'] },
      { h: 'Three patterns worth flagging', p: ['First, "money-back-as-cash" mechanics replaced "money-back-as-free-bet" for the first time at scale. Six operators ran it, four for the full festival. The unit economics on this are markedly worse.','Second, price-boost frequency hit a record. The top three boosters ran more boosts on Day 1 alone than all of Cheltenham 2024 combined.','Third, three operators ran hero offers that, on our model, lost money on a per-FTD basis even before churn. We\'ve flagged this internally to clients.'] },
      { h: 'Implications for the autumn', p: ['Some of this aggression is unsustainable. Expect a market correction in Q3.','Operators who held the line in Q1/Q2 should plan to lean in.','Operators who over-extended should plan a quiet autumn.'] },
    ],
    related: ['how-to-build-promo-intelligence-framework','tier-1-operator-promo-waste-reduction','jurnii-vs-manual-tracking'],
  },
  'igaming-intelligence-trends-2026': {
    tldr: ['UX intelligence overtook generic competitor monitoring as the #1 commercial-intelligence budget growth area.','MMM is moving from "annual deck" to "quarterly tool" at Tier 1 operators.','In-house competitor-tracking teams shrinking; outsourced structured-data feeds growing.','AI tooling: differentiation is moving from "we have an LLM" to "we have proprietary structured data feeding our LLM."'],
    sections: [
      { h: 'Where budget is moving', p: ['Up: structured competitor data feeds (+34% YoY across our client base), automated UX benchmarking (+41%), iGaming-specific MMM (+22%).','Down: bespoke quarterly research studies (-19%), in-house competitor-tracking analyst headcount (-11%).','Flat: brand tracking, generic web analytics tools.'] },
      { h: 'The structural shift', p: ['Operators are buying intelligence as data, not as PowerPoint. The deliverable is an API and a dashboard, not a deck. The relationship is multi-year, not project-based.','That changes who you procure from. Old-world consultancies aren\'t set up for it. New-world data businesses are.'] },
    ],
    related: ['ai-igaming-proprietary-intelligence','experience-is-the-new-battleground','cheltenham-2026-promotional-intelligence'],
  },
  'experience-is-the-new-battleground': {
    tldr: ['Promotional arms races have a ceiling. Every Tier 1 has hit it.','The next axis of competition is experience — not "design" in the abstract, but measurable, NGR-weighted UX.','Operators investing here in 2026 will look structurally advantaged by 2027.'],
    sections: [
      { h: 'Why promo can\'t be the answer', p: ['Three reasons. Regulatory: ad bans, affordability checks, and bonus restrictions are tightening, not loosening. Margin: the unit economics of the most aggressive promo offers are already negative for some operators. Differentiation: every operator is running broadly the same offers with broadly the same mechanics.','When everyone is offering the same £30 free bet, the £30 free bet is a tax, not a moat.'] },
      { h: 'Why experience compounds', p: ['Every UX improvement applies to every player, every session, forever. A 2-point improvement in deposit conversion is permanent.','Experience compounds. Promo doesn\'t.'] },
      { h: 'What this looks like in practice', p: ['Quarterly UX scoring. Findings prioritised by NGR impact. Roadmaps explicitly weighted by expected score uplift.','It\'s not glamorous. It\'s relentless. And the operators doing it are quietly pulling away from the ones who aren\'t.'] },
    ],
    related: ['jurnii-vs-ux-agencies','how-to-run-ux-audit-igaming','tier-1-operator-promo-waste-reduction'],
  },
  'ai-igaming-proprietary-intelligence': {
    tldr: ['Generic LLMs commoditise quickly. They\'re not the moat.','Proprietary, structured competitive data is.','The operators winning with AI in 2026 are the ones with feeds nobody else has.'],
    sections: [
      { h: 'The commoditisation curve', p: ['Six months ago, "we have GPT-4 inside our trading desk" was a differentiator. Today, every Tier 1 has it. By Q4 2026, it will be table stakes.','What stays differentiated is the data feeding the model.'] },
      { h: 'What proprietary data looks like', p: ['Daily-captured, structured competitor offers across 20+ brands and four years of history. Player-level (anonymised) experience scoring against five peers, refreshed quarterly. Channel-level spend efficiency, modelled with calendar and competitor inputs as first-class variables.','None of that is in a public LLM\'s training set. None of it is going to be.'] },
    ],
    related: ['igaming-intelligence-trends-2026','jurnii-vs-manual-tracking','jurnii-vs-nielsen'],
  },
  'tier-1-operator-promo-waste-reduction': {
    tldr: ['Tier 1 European operator. ~£280m NGR. 8 markets.','First 90 days with Jurnii 360.','Three reload offers identified for cutting. Two were cut. £4.2m annualised saving.','Zero measured churn impact across the affected segments.'],
    sections: [
      { h: 'The problem the team had', p: ['"We have offers we suspect we don\'t need to run, but nobody can prove it. Every time someone proposes cutting one, the CRM team flags churn risk and the conversation ends."','That\'s a quote from the first scoping call. It\'s the most common version of this problem we hear.'] },
      { h: 'The first 30 days — calibration', p: ['Scope: 12 competitors, 4 markets, daily capture. Schema agreed in week one. Calibration in week two — comparing our captured offers against the operator\'s manual screenshot library to confirm fidelity.','First insight surfaced in week three: nine of the operator\'s twelve reload offers had no equivalent in the live market. Not "fewer." None.'] },
      { h: 'The next 60 days — action', p: ['Three of the nine offers were proposed for cutting. The CRM team did segment-level churn modelling against the affected cohorts. Risk was assessed as low for two, moderate for one.','Two were cut on a 30-day test. One was held.','Annualised saving on the two cut: £4.2m. Measured churn impact: zero, within statistical noise.'] },
      { h: 'The bigger insight', p: ['The cost saving was the headline. The bigger value was unlocking the conversation. The CRM team now had structured market evidence — not opinion. Three more proposals went through in Q2.'] },
    ],
    related: ['jurnii-vs-manual-tracking','how-to-build-promo-intelligence-framework','cheltenham-2026-promotional-intelligence'],
  },
};
