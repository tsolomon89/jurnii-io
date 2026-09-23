import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  MarketReportSchema,
  EvidenceManifestSchema,
  SocialPackageSchema,
  VALID_LENS_FORMAT_COMBINATIONS,
} from '../src/content-engine/schemas/market-report.schema';

const cwd = process.cwd();
const fixturesDir = path.join(cwd, 'src/content-engine/fixtures/market-reports');
const libraryDir = path.join(cwd, 'content/library');

console.log('====================================================');
console.log('  Jurnii Market Report & Social Validator (Strict)  ');
console.log('====================================================\n');

let totalErrors = 0;
let totalPassed = 0;

function reportPass(msg: string) {
  console.log(`✅ PASS: ${msg}`);
  totalPassed++;
}

function reportFail(msg: string, details?: any) {
  console.error(`❌ FAIL: ${msg}`);
  if (details) {
    console.error(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
  }
  totalErrors++;
}

// ----------------------------------------------------
// PART 1: Validate Schema Fixtures (7 Valid + Negative)
// ----------------------------------------------------
console.log('--- PART 1: Validating Schema Fixtures ---');

if (fs.existsSync(fixturesDir)) {
  const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

  for (const file of fixtureFiles) {
    const filePath = path.join(fixturesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const isExpectedValid = file.startsWith('valid-');
    const result = MarketReportSchema.safeParse(content);

    if (isExpectedValid) {
      if (result.success) {
        reportPass(`Valid fixture: ${file}`);
      } else {
        reportFail(`Valid fixture failed validation: ${file}`, result.error.format());
      }
    } else {
      // Expected to fail
      if (!result.success) {
        reportPass(`Negative fixture correctly rejected: ${file} (Error: ${result.error.issues[0]?.message})`);
      } else {
        reportFail(`Negative fixture unexpectedly passed validation: ${file}`);
      }
    }
  }
} else {
  reportFail(`Fixtures directory not found: ${fixturesDir}`);
}

// ----------------------------------------------------
// PART 2: Validate Published Market Reports & Social
// ----------------------------------------------------
console.log('\n--- PART 2: Validating Library Market Reports ---');

const PROHIBITED_WORDS = [
  /—/g, // Unicode em dash
  /\brevolutionary\b/i,
  /\bgame-changer\b/i,
  /\bcutting-edge\b/i,
  /\bseamless(?:ly)?\b/i,
  /\bdelightful\b/i,
  /\bintuitive\b/i,
  /\bleverage\b/i,
  /\bholistic(?:ally)?\b/i,
  /\bbest-in-class\b/i,
  /\btodo\b/i,
  /\btbd\b/i,
  /\blorem ipsum\b/i,
];

const UNBOUNDED_DATE_TERMS = [
  /\bin recent months\b/i,
  /\blast month\b/i,
  /\brecently\b/i,
];

if (fs.existsSync(libraryDir)) {
  const libraryFiles = fs.readdirSync(libraryDir).filter((f) => f.endsWith('.md'));

  for (const file of libraryFiles) {
    const fullPath = path.join(libraryDir, file);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const parsed = matter(raw);

    if (parsed.data.medium === 'Market Report') {
      const slug = path.basename(file, '.md');
      console.log(`\nInspecting Market Report: ${file} (${slug})`);

      if (parsed.data.isLegacyRegionalReport) {
        // Legacy regional report verification
        if (parsed.data.noindex !== true && parsed.data.isIndexable !== false) {
          reportFail(`Legacy regional report "${file}" must have noindex: true or isIndexable: false`);
        } else {
          reportPass(`Legacy regional report safely archived/noindexed: ${file}`);
        }

        // Verify superseded warning banner exists in content
        if (
          !parsed.content.includes('Superseded Model') &&
          !parsed.content.includes('Historical Archive') &&
          !parsed.content.includes('superseded')
        ) {
          reportFail(`Legacy regional report "${file}" is missing a superseded warning banner.`);
        } else {
          reportPass(`Legacy regional report contains superseded banner: ${file}`);
        }
        continue;
      }

      // ACTIVE MARKET REPORT VALIDATION
      const schemaResult = MarketReportSchema.safeParse(parsed.data);
      if (!schemaResult.success) {
        reportFail(`Frontmatter schema failure in ${file}`, schemaResult.error.format());
        continue;
      } else {
        reportPass(`Frontmatter conforms to MarketReportSchema: ${file}`);
      }

      // Check Evidence Manifest
      const manifestRel = parsed.data.evidenceManifest;
      const cleanManifestRel = manifestRel.replace(/^\//, '');
      const manifestPath = path.join(cwd, cleanManifestRel.startsWith('.agents') ? cleanManifestRel : `.agents/context/market-reports/${cleanManifestRel}`);

      let loadedManifest: any = null;
      if (!fs.existsSync(manifestPath)) {
        // Also check if relative to content/library
        const altPath = path.join(cwd, 'content/library', cleanManifestRel);
        if (fs.existsSync(altPath)) {
          loadedManifest = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
        } else {
          reportFail(`Evidence manifest does not exist at "${manifestPath}" or "${altPath}"`);
        }
      } else {
        loadedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      }

      const claimIdsInManifest = new Set<string>();
      if (loadedManifest) {
        const manifestResult = EvidenceManifestSchema.safeParse(loadedManifest);
        if (!manifestResult.success) {
          reportFail(`Evidence manifest schema invalid for ${file}`, manifestResult.error.format());
        } else {
          reportPass(`Evidence manifest conforms to EvidenceManifestSchema: ${manifestRel}`);
          loadedManifest.claims.forEach((c: any) => claimIdsInManifest.add(c.id));
        }
      }

      // Check Social Package
      const socialRel = parsed.data.socialPackage;
      const cleanSocialRel = socialRel.replace(/^\//, '');
      const socialPath = path.join(cwd, cleanSocialRel.startsWith('.agents') ? cleanSocialRel : `.agents/context/market-reports/${cleanSocialRel}`);

      let loadedSocial: any = null;
      if (!fs.existsSync(socialPath)) {
        const altPath = path.join(cwd, 'content/library', cleanSocialRel);
        if (fs.existsSync(altPath)) {
          loadedSocial = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
        } else {
          reportFail(`Social package does not exist at "${socialPath}" or "${altPath}"`);
        }
      } else {
        loadedSocial = JSON.parse(fs.readFileSync(socialPath, 'utf-8'));
      }

      if (loadedSocial) {
        const socialResult = SocialPackageSchema.safeParse(loadedSocial);
        if (!socialResult.success) {
          reportFail(`Social package schema invalid for ${file}`, socialResult.error.format());
        } else {
          reportPass(`Social package conforms to SocialPackageSchema (${loadedSocial.posts.length} posts): ${socialRel}`);

          // Validate each post claims map to evidence manifest and contains no internal leaks
          loadedSocial.posts.forEach((post: any, pIdx: number) => {
            const unmappedClaims = post.claimIds.filter((cid: string) => !claimIdsInManifest.has(cid));
            if (unmappedClaims.length > 0 && claimIdsInManifest.size > 0) {
              reportFail(
                `Social post ${post.id} (#${pIdx + 1}) references unmapped claims: ${unmappedClaims.join(', ')}`
              );
            } else {
              reportPass(`Social post ${post.id} claims cleanly map to evidence manifest`);
            }

            // Check no internal leaks in social post body or cta destination
            const postLeakPatterns = [/\.agents\//i, /app\.jurnii\.io/i, /quill\.jurnii\.io/i];
            let postHasLeak = false;
            for (const pattern of postLeakPatterns) {
              if (pattern.test(post.body) || pattern.test(post.cta?.destination || '')) {
                reportFail(`Social post ${post.id} contains internal leak pattern "${pattern.source}" in body or CTA destination.`);
                postHasLeak = true;
              }
            }
            if (!postHasLeak) {
              reportPass(`Social post ${post.id} has no internal leaks`);
            }
          });
        }
      }

      // Check Body Prose Quality
      const bodyLines = parsed.content.split('\n');
      let bodyH1Found = false;
      bodyLines.forEach((line, lineIdx) => {
        if (/^#\s+[^#]/.test(line.trim())) {
          bodyH1Found = true;
          reportFail(`Found Markdown # H1 on line ${lineIdx + 1} in ${file}. (Template provides H1 automatically)`);
        }
      });
      if (!bodyH1Found) {
        reportPass(`No redundant body H1 in ${file}`);
      }

      // Check Prohibited Phrases & Em dashes
      let hasProhibited = false;
      for (const pattern of PROHIBITED_WORDS) {
        if (pattern.test(parsed.content)) {
          reportFail(`Prohibited phrase/symbol "${pattern.source}" found in ${file}`);
          hasProhibited = true;
        }
      }
      if (!hasProhibited) {
        reportPass(`Clean editorial prose (no prohibited buzzwords or em dashes) in ${file}`);
      }

      // Check Prohibited Internal Scaffolding Leaks in Public Body
      const INTERNAL_LEAK_PATTERNS = [
        /\.agents\//i,
        /evidenceManifest/i,
        /socialPackage/i,
        /app\.jurnii\.io/i,
        /quill\.jurnii\.io/i,
        /data integrity and evidence provenance/i,
        /audited urls/i,
      ];

      let hasInternalLeak = false;
      for (const pattern of INTERNAL_LEAK_PATTERNS) {
        if (pattern.test(parsed.content)) {
          reportFail(`Internal scaffolding or platform locator leak in public body: pattern "${pattern.source}" found in ${file}. Remove internal repo paths, evidence provenance dumps, and app URLs from the public article body.`);
          hasInternalLeak = true;
        }
      }
      if (!hasInternalLeak) {
        reportPass(`No internal scaffolding or platform locator leaks in ${file}`);
      }

      // Check Unbounded Date Terms
      for (const pattern of UNBOUNDED_DATE_TERMS) {
        if (pattern.test(parsed.content)) {
          console.warn(`⚠️ WARNING: Vague temporal expression "${pattern.source}" found in ${file}. Ensure dates are explicitly bounded.`);
        }
      }
    }
  }
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`Validation Complete: ${totalPassed} PASSED, ${totalErrors} ERRORS`);
console.log('====================================================');

if (totalErrors > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL MARKET REPORT CHECKS PASSED CLEANLY!\n');
  process.exit(0);
}
