import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const cwd = process.cwd();
const legacyDir = path.join(cwd, '.agents/context/legacy');
const contentWwwDir = path.join(cwd, 'content/www');

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToMarkdownProse(htmlString) {
  if (!htmlString) return '';

  let text = htmlString;

  // Extract manifesto / lede paragraph
  const manifestoMatch = text.match(/<section class="feature-manifesto"[^>]*>([\s\S]*?)<\/section>/i);
  let manifestoText = '';
  if (manifestoMatch) {
    manifestoText = cleanText(manifestoMatch[1]);
  }

  // Extract challenge section ("The Cost of Operating Blind" & "How Jurnii Resolves This")
  const challengeMatch = text.match(/<section class="challenge-section"[^>]*>([\s\S]*?)<\/section>/i);
  let challengeTitle = 'The Cost of Operating Blind';
  let challengeBody = '';
  let resolveBody = '';
  let commercialImpact = '';

  if (challengeMatch) {
    const cHtml = challengeMatch[1];
    const h2Match = cHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (h2Match) challengeTitle = cleanText(h2Match[1]);

    const paragraphs = Array.from(cHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map(m => cleanText(m[1]));
    if (paragraphs.length >= 1) challengeBody = paragraphs[0];
    if (paragraphs.length >= 2) resolveBody = paragraphs[1];

    const impactMatch = cHtml.match(/<div class="implication-callout"[^>]*>([\s\S]*?)<\/div>/i);
    if (impactMatch) {
      commercialImpact = cleanText(impactMatch[1]);
    }
  }

  // Extract workflow steps
  const workflowSteps = [];
  const stepMatches = Array.from(text.matchAll(/<div class="feature-workflow-step"[^>]*>([\s\S]*?)<\/div>/gi));
  for (const step of stepMatches) {
    const sHtml = step[1];
    const numMatch = sHtml.match(/<span class="feature-workflow-num">([\s\S]*?)<\/span>/i);
    const h3Match = sHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const pMatch = sHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (h3Match && pMatch) {
      workflowSteps.push({
        step: numMatch ? cleanText(numMatch[1]) : `Step ${workflowSteps.length + 1}`,
        title: cleanText(h3Match[1]),
        description: cleanText(pMatch[1]),
      });
    }
  }

  // Build clean Markdown prose
  let md = '';

  if (manifestoText) {
    md += `## Executive Summary\n\n${manifestoText}\n\n`;
  }

  if (challengeBody || resolveBody) {
    md += `## ${challengeTitle}\n\n`;
    if (challengeBody) md += `${challengeBody}\n\n`;
    if (resolveBody) md += `${resolveBody}\n\n`;
  }

  if (commercialImpact) {
    md += `> **Commercial Impact**: ${commercialImpact}\n\n`;
  }

  if (workflowSteps.length > 0) {
    md += `## Operational Execution Flow\n\n`;
    for (const ws of workflowSteps) {
      md += `### ${ws.step}: ${ws.title}\n${ws.description}\n\n`;
    }
  }

  return md.trim();
}

function processLegacyCategory(categoryFolder) {
  const absLegacyFolder = path.join(legacyDir, categoryFolder);
  if (!fs.existsSync(absLegacyFolder)) return;

  const files = fs.readdirSync(absLegacyFolder).filter(f => f.endsWith('.html') && f !== 'index.html');
  console.log(`Processing legacy ${categoryFolder} (${files.length} files)...`);

  for (const file of files) {
    const filePath = path.join(absLegacyFolder, file);
    const html = fs.readFileSync(filePath, 'utf-8');

    const slug = file.replace(/\.html$/, '');
    const targetDir = path.join(contentWwwDir, categoryFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, `${slug}.md`);

    // Existing metadata check
    let existingMeta = {};
    if (fs.existsSync(targetFilePath)) {
      const existingRaw = fs.readFileSync(targetFilePath, 'utf-8');
      existingMeta = matter(existingRaw).data || {};
    }

    // Extract title
    let title = existingMeta.title;
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      title = h1Match ? cleanText(h1Match[1]) : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Extract description
    let description = existingMeta.description;
    if (!description) {
      const ledeMatch = html.match(/<p class="page-hero-lede"[^>]*>([\s\S]*?)<\/p>/i);
      description = ledeMatch ? cleanText(ledeMatch[1]) : `${title} commercial intelligence module for iGaming operators.`;
    }

    // Extract heroFeatures (workflow steps or key bullets)
    const heroFeatures = existingMeta.heroFeatures || [];
    if (heroFeatures.length === 0) {
      const stepMatches = Array.from(html.matchAll(/<div class="feature-workflow-step"[^>]*>([\s\S]*?)<\/div>/gi));
      for (const s of stepMatches.slice(0, 3)) {
        const h3Match = s[1].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        const pMatch = s[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (h3Match && pMatch) {
          heroFeatures.push({
            title: cleanText(h3Match[1]),
            description: cleanText(pMatch[1]),
          });
        }
      }
    }

    // Extract pullQuote
    let pullQuote = existingMeta.pullQuote;
    let pullQuoteAttribution = existingMeta.pullQuoteAttribution;
    if (!pullQuote) {
      const manifestoMatch = html.match(/<section class="feature-manifesto"[^>]*>([\s\S]*?)<\/section>/i);
      if (manifestoMatch) {
        pullQuote = cleanText(manifestoMatch[1]);
        pullQuoteAttribution = "Chief Commercial Officer, European Tier-1 Operator";
      }
    }

    // Generate prose body
    const bodyProse = htmlToMarkdownProse(html);

    // Front-matter assembly
    const frontMatter = {
      title,
      description,
      category: existingMeta.category || (categoryFolder === 'features' ? 'Competitor' : categoryFolder === 'solutions' ? 'Optimization' : 'Product'),
      order: typeof existingMeta.order === 'number' ? existingMeta.order : 10,
      icon: existingMeta.icon || 'lucide:Zap',
      ...(heroFeatures.length > 0 ? { heroFeatures } : {}),
      ...(pullQuote ? { pullQuote, pullQuoteAttribution } : {}),
      productRefs: existingMeta.productRefs || (slug.startsWith('jurnii-') ? [] : ['jurnii-360', 'jurnii-ux']),
      featureRefs: existingMeta.featureRefs || [],
      solutionRefs: existingMeta.solutionRefs || [],
      useCaseValueRefs: existingMeta.useCaseValueRefs || [],
    };

    const mdContent = bodyProse || `# ${title}\n\n${description}`;
    const newMarkdown = matter.stringify(mdContent, frontMatter);

    fs.writeFileSync(targetFilePath, newMarkdown, 'utf-8');
    console.log(`✓ Enriched ${categoryFolder}/${slug}.md`);
  }
}

processLegacyCategory('products');
processLegacyCategory('features');
processLegacyCategory('solutions');

console.log('\nLegacy content extraction complete!');
