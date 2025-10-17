import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!
});

interface CheckResult {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  details: string;
  recommendation: string;
}

// Calculate Flesch-Kincaid readability score
function calculateReadability(text: string): number {
  // Simple approximation of Flesch Reading Ease
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((acc, word) => {
    // Simple syllable counting: count vowel groups
    return acc + (word.match(/[aeiouAEIOU]+/g) || []).length || 1;
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

// Extract text content from HTML
function extractTextContent(html: string): string {
  // Remove script and style tags (using [\s\S] instead of . with s flag)
  let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  cleanHtml = cleanHtml.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  cleanHtml = cleanHtml.replace(/&nbsp;/g, ' ');
  cleanHtml = cleanHtml.replace(/&amp;/g, '&');
  cleanHtml = cleanHtml.replace(/&lt;/g, '<');
  cleanHtml = cleanHtml.replace(/&gt;/g, '>');
  cleanHtml = cleanHtml.replace(/&quot;/g, '"');
  cleanHtml = cleanHtml.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  return cleanHtml.replace(/\s+/g, ' ').trim();
}

async function analyzeHTML(html: string, metadata: any, url: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  console.log('[AI-READY] HTML Check 1/5: Extracting text content...');
  const textContent = extractTextContent(html);
  
  console.log('[AI-READY] HTML Check 2/5: Analyzing heading structure...');
  // 1. Heading Structure (High Signal)
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  const headings = html.match(/<h([1-6])[^>]*>/gi) || [];
  const headingLevels = headings.map(h => parseInt(h.match(/<h([1-6])/i)?.[1] || '0'));
  
  let headingScore = 100;
  let headingIssues: string[] = [];
  
  // Check for single H1
  if (h1Count === 0) {
    headingScore -= 40;
    headingIssues.push('No H1 found');
  } else if (h1Count > 1) {
    headingScore -= 30;
    headingIssues.push(`Multiple H1s (${h1Count}) create topic ambiguity`);
  }
  
  // Check heading hierarchy
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i-1] > 1) {
      headingScore -= 15;
      headingIssues.push(`Skipped heading level (H${headingLevels[i-1]} → H${headingLevels[i]})`);
    }
  }
  
  headingScore = Math.max(0, headingScore);
  
  results.push({
    id: 'heading-structure',
    label: '見出し階層',
    status: headingScore >= 80 ? 'pass' : headingScore >= 50 ? 'warning' : 'fail',
    score: headingScore,
    details: headingIssues.length > 0 ? headingIssues.join(', ') : `完璧な階層構造：H1が${h1Count}個、論理的な構造`,
    recommendation: headingScore < 80 ? 
      'H1を1つだけ使用し、論理的な見出し階層（H1→H2→H3）を維持してください' : 
      'AI理解に優れた見出し構造です'
  });
  
  console.log('[AI-READY] HTML Check 3/5: Calculating readability score...');
  // 3. Readability Score (High Signal)
  const readabilityScore = calculateReadability(textContent);
  let readabilityStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let readabilityDetails = '';
  let normalizedScore = 0;
  
  if (readabilityScore >= 70) {
    normalizedScore = 100;
    readabilityStatus = 'pass';
    readabilityDetails = `非常に読みやすい (Flesch: ${Math.round(readabilityScore)})`;
  } else if (readabilityScore >= 50) {
    normalizedScore = 80;
    readabilityStatus = 'pass';
    readabilityDetails = `読みやすい (Flesch: ${Math.round(readabilityScore)})`;
  } else if (readabilityScore >= 30) {
    normalizedScore = 50;
    readabilityStatus = 'warning';
    readabilityDetails = `読みにくい (Flesch: ${Math.round(readabilityScore)})`;
  } else {
    normalizedScore = 20;
    readabilityStatus = 'fail';
    readabilityDetails = `非常に読みにくい (Flesch: ${Math.round(readabilityScore)})`;
  }
  
  results.push({
    id: 'readability',
    label: 'コンテンツ可読性',
    status: readabilityStatus,
    score: normalizedScore,
    details: readabilityDetails,
    recommendation: normalizedScore < 80 ? 
      'AI理解を向上させるために文章を簡潔にし、より明確な言語を使用してください' : 
      'コンテンツは明確に書かれており、AIに適しています'
  });
  
  console.log('[AI-READY] HTML Check 4/5: Checking metadata quality...');
  // 4. Enhanced Metadata Quality (Medium Signal)
  const hasOgTitle = metadata?.ogTitle || metadata?.title || html.includes('og:title') || html.includes('<title');
  const hasOgDescription = metadata?.ogDescription || metadata?.description || html.includes('og:description') || html.includes('name="description"');
  
  // Check description quality
  const descMatch = html.match(/content="([^"]*)"/i);
  const descLength = descMatch?.[1]?.length || 0;
  const hasGoodDescLength = descLength >= 70 && descLength <= 160;
  
  const hasCanonical = html.includes('rel="canonical"');
  const hasAuthor = html.includes('name="author"') || html.includes('property="article:author"');
  const hasPublishDate = html.includes('property="article:published_time"') || html.includes('property="article:modified_time"');
  
  // Enhanced scoring - be more generous
  let metaScore = 30; // Base score for having a page
  let metaDetails: string[] = [];
  
  if (hasOgTitle) {
    metaScore += 30;
    metaDetails.push('タイトル ✓');
  } else if (html.includes('<title')) {
    metaScore += 20;
    metaDetails.push('基本タイトル');
  }
  
  if (hasOgDescription) {
    metaScore += 25;
    if (hasGoodDescLength) {
      metaScore += 10;
      metaDetails.push('説明 ✓');
    } else {
      metaDetails.push('説明');
    }
  }
  
  if (hasAuthor) {
    metaScore += 10;
    metaDetails.push('作者 ✓');
  }
  if (hasPublishDate) {
    metaScore += 10;
    metaDetails.push('日付 ✓');
  }
  
  // Cap at 100
  metaScore = Math.min(100, metaScore);
  results.push({
    id: 'meta-tags',
    label: 'メタデータ品質',
    status: metaScore >= 70 ? 'pass' : metaScore >= 40 ? 'warning' : 'fail',
    score: metaScore,
    details: metaDetails.length > 0 ? metaDetails.join(', ') : '重要なメタデータが不足',
    recommendation: metaScore < 70 ? 
      'タイトル、説明（70-160文字）、作者、公開日のメタデータを追加してください' : 
      'メタデータがAIに優れたコンテキストを提供しています'
  });
  
  console.log('[AI-READY] HTML Check 5/5: Checking semantic HTML and accessibility...');
  // 6. Semantic HTML (Medium Signal)
  const semanticTags = ['<article', '<nav', '<main', '<section', '<header', '<footer', '<aside'];
  const semanticCount = semanticTags.filter(tag => html.includes(tag)).length;
  
  // Modern SPAs might use divs with proper ARIA roles
  const hasAriaRoles = html.includes('role="') || html.includes('aria-');
  const isModernFramework = html.includes('__next') || html.includes('_app') || html.includes('react') || html.includes('vue') || html.includes('svelte');
  
  const semanticScore = Math.min(100, 
    (semanticCount / 5) * 60 + 
    (hasAriaRoles ? 20 : 0) + 
    (isModernFramework ? 20 : 0));
  
  results.push({
    id: 'semantic-html',
    label: 'セマンティックHTML',
    status: semanticScore >= 80 ? 'pass' : semanticScore >= 40 ? 'warning' : 'fail',
    score: semanticScore,
    details: `${semanticCount}個のセマンティックHTML5要素を発見`,
    recommendation: semanticScore < 80 ? 'より多くのセマンティックHTML5要素（article、nav、main、sectionなど）を使用してください' : 'セマンティックHTMLの優れた使用'
  });
  
  // 7. Check accessibility (Lower Signal but still important)
  const hasAltText = (html.match(/alt="/g) || []).length;
  const imgCount = (html.match(/<img/g) || []).length;
  const altTextRatio = imgCount > 0 ? (hasAltText / imgCount) * 100 : 100;
  const hasAriaLabels = html.includes('aria-label');
  const hasAriaDescribedBy = html.includes('aria-describedby');
  const hasRole = html.includes('role="');
  const hasLangAttribute = html.includes('lang="');
  
  // Sites with no images shouldn't be penalized
  const imageScore = imgCount === 0 ? 40 : (altTextRatio * 0.4);
  
  const accessibilityScore = Math.min(100, 
    imageScore + 
    (hasAriaLabels ? 20 : 0) + 
    (hasAriaDescribedBy ? 10 : 0) + 
    (hasRole ? 15 : 0) + 
    (hasLangAttribute ? 15 : 0));
  
  results.push({
    id: 'accessibility',
    label: 'アクセシビリティ',
    status: accessibilityScore >= 80 ? 'pass' : accessibilityScore >= 50 ? 'warning' : 'fail',
    score: Math.round(accessibilityScore),
    details: `${Math.round(altTextRatio)}%の画像にaltテキスト、ARIAラベル: ${hasAriaLabels ? 'あり' : 'なし'}`,
    recommendation: accessibilityScore < 80 ? 'すべての画像にaltテキストを追加し、インタラクティブ要素にARIAラベルを使用してください' : '良好なアクセシビリティ実装'
  });
  return results;
}

async function checkAdditionalFiles(domain: string): Promise<{ robots: CheckResult, sitemap: CheckResult, llms: CheckResult }> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const cleanUrl = new URL(baseUrl).origin;
  
  // Helper function to fetch with timeout
  const fetchWithTimeout = async (url: string, timeout = 3000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  // Define default results
  let robotsCheck: CheckResult = {
    id: 'robots-txt',
    label: 'Robots.txt',
    status: 'fail',
    score: 0,
    details: 'robots.txtファイルが見つかりません',
    recommendation: 'AIクローラー指示を含むrobots.txtファイルを作成してください'
  };
  
  let sitemapCheck: CheckResult = {
    id: 'sitemap',
    label: 'サイトマップ',
    status: 'fail',
    score: 0,
    details: 'sitemap.xmlが見つかりません',
    recommendation: 'XMLサイトマップを生成して送信してください'
  };
  
  let llmsCheck: CheckResult = {
    id: 'llms-txt',
    label: 'LLMs.txt',
    status: 'fail',
    score: 0,
    details: 'llms.txtファイルが見つかりません',
    recommendation: 'AI使用権限を定義するllms.txtファイルを追加してください'
  };
  
  // Store robots.txt content for sitemap extraction
  let robotsText = '';
  let sitemapUrls: string[] = [];
  
  // Create all fetch promises in parallel
  const promises = [
    // Check robots.txt
    fetchWithTimeout(`${cleanUrl}/robots.txt`)
      .then(async (response) => {
        if (response.ok) {
          robotsText = await response.text();
          const hasUserAgent = robotsText.toLowerCase().includes('user-agent');
          
          // Extract sitemap URLs from robots.txt
          const sitemapMatches = robotsText.match(/Sitemap:\s*(.+)/gi);
          if (sitemapMatches) {
            sitemapUrls = sitemapMatches.map(match => 
              match.replace(/Sitemap:\s*/i, '').trim()
            );
          }
          
          const hasSitemap = sitemapUrls.length > 0;
          const score = (hasUserAgent ? 60 : 0) + (hasSitemap ? 40 : 0);
          
          robotsCheck = {
            id: 'robots-txt',
            label: 'Robots.txt',
            status: score >= 80 ? 'pass' : score >= 40 ? 'warning' : 'fail',
            score,
            details: `Robots.txt発見${hasSitemap ? `（${sitemapUrls.length}個のサイトマップ参照付き）` : ''}`,
            recommendation: score < 80 ? 'robots.txtにサイトマップ参照を追加してください' : 'Robots.txtが適切に設定されています'
          };
        }
      })
      .catch(() => {}), // Ignore errors, use default
    
    // Check llms.txt variations in parallel
    ...['llms.txt', 'LLMs.txt', 'llms-full.txt'].map(filename =>
      fetchWithTimeout(`${cleanUrl}/${filename}`)
        .then(async (response) => {
          if (response.ok) {
            const llmsText = await response.text();
            // Verify it's actually an LLMs.txt file, not a 404 page or HTML
            const isValidLlms = (
              llmsText.length > 10 && // Has some content
              !llmsText.includes('<!DOCTYPE') && 
              !llmsText.includes('<html') &&
              !llmsText.includes('<HTML') &&
              !llmsText.toLowerCase().includes('404 not found') &&
              !llmsText.toLowerCase().includes('page not found') &&
              !llmsText.toLowerCase().includes('cannot be found')
            );
            
            if (isValidLlms) {
              llmsCheck = {
                id: 'llms-txt',
                label: 'LLMs.txt',
                status: 'pass',
                score: 100,
                details: `${filename}ファイル発見（AI使用ガイドライン付き）`,
                recommendation: '素晴らしい！AI使用権限を定義しています'
              };
            }
          }
        })
        .catch(() => {}) // Ignore errors
    )
  ];
  
  // Wait for all promises to complete (with timeout)
  await Promise.all(promises);
  
  // After checking robots.txt, now check for sitemaps
  // First check URLs from robots.txt, then fallback to common locations
  const possibleSitemapUrls = [...sitemapUrls];
  
  // Add common sitemap locations if not already in list
  const commonLocations = [
    `${cleanUrl}/sitemap.xml`,
    `${cleanUrl}/sitemap_index.xml`,
    `${cleanUrl}/sitemap-index.xml`,
    `${cleanUrl}/sitemaps/sitemap.xml`,
    `${cleanUrl}/sitemap/sitemap.xml`
  ];
  
  for (const url of commonLocations) {
    if (!possibleSitemapUrls.includes(url)) {
      possibleSitemapUrls.push(url);
    }
  }
  
  // Check all possible sitemap URLs
  for (const sitemapUrl of possibleSitemapUrls) {
    try {
      const response = await fetchWithTimeout(sitemapUrl);
      if (response.ok) {
        const content = await response.text();
        // Verify it's actually an XML sitemap
        const isValidSitemap = (
          content.includes('<?xml') || 
          content.includes('<urlset') || 
          content.includes('<sitemapindex') ||
          content.includes('<url>') ||
          content.includes('<sitemap>')
        ) && !content.includes('<!DOCTYPE html');
        
        if (isValidSitemap) {
          const fromRobots = sitemapUrls.includes(sitemapUrl);
          sitemapCheck = {
            id: 'sitemap',
            label: 'サイトマップ',
            status: 'pass',
            score: 100,
            details: `有効なXMLサイトマップ発見${fromRobots ? '（robots.txtで参照済み）' : `（${sitemapUrl.replace(cleanUrl, '')}に配置）`}`,
            recommendation: 'サイトマップが適切に設定されています'
          };
          break; // Found a valid sitemap, stop checking
        }
      }
    } catch (error) {
      // Continue checking other URLs
    }
  }
  
  return { robots: robotsCheck, sitemap: sitemapCheck, llms: llmsCheck };
}

// Domain reputation bonus for well-known, AI-friendly sites
function getDomainReputationBonus(domain: string): number {
  const topTierDomains = [
    'vercel.com', 'stripe.com', 'github.com', 'openai.com', 
    'anthropic.com', 'google.com', 'microsoft.com', 'apple.com',
    'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com',
    'react.dev', 'nextjs.org', 'tailwindcss.com'
  ];
  
  const secondTierDomains = [
    'netlify.com', 'heroku.com', 'digitalocean.com', 'cloudflare.com',
    'twilio.com', 'slack.com', 'notion.so', 'linear.app', 'figma.com'
  ];
  
  // Remove www. and check
  const cleanDomain = domain.replace('www.', '');
  
  // Check for documentation sites first (highest priority)
  if (cleanDomain.includes('docs.') || cleanDomain.includes('developer.') || cleanDomain.includes('api.')) {
    return 20; // 20% bonus for documentation sites
  }
  
  if (topTierDomains.some(d => cleanDomain === d || cleanDomain.endsWith(`.${d}`))) {
    return 18; // 18% bonus for top-tier sites
  }
  
  if (secondTierDomains.some(d => cleanDomain === d || cleanDomain.endsWith(`.${d}`))) {
    return 12; // 12% bonus for second-tier sites
  }
  
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    let { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: '無効なURL形式です' }, { status: 400 });
    }
    
    console.log('[AI-READY] Step 1/4: Starting Firecrawl scrape...');
    const scrapeStartTime = Date.now();
    
    // Scrape the website using Firecrawl v2
    let scrapeResult;
    try {
      scrapeResult = await firecrawl.scrape(url, {
        formats: ['html'],
      });
      console.log(`[AI-READY] Step 1/4: Firecrawl scrape completed in ${Date.now() - scrapeStartTime}ms`);
    } catch (scrapeError) {
      console.error('Firecrawl scrape error:', scrapeError);
      return NextResponse.json({ error: 'ウェブサイトのスクレイプに失敗しました。URLを確認してください。' }, { status: 500 });
    }
    
    // Check different possible response structures
    const html = scrapeResult?.html || scrapeResult?.data?.html || scrapeResult?.content || '';
    const metadata = scrapeResult?.metadata || scrapeResult?.data?.metadata || {};
    
    if (!html) {
      console.error('No HTML content found in response');
      return NextResponse.json({ error: 'ウェブサイトからコンテンツの抽出に失敗しました' }, { status: 500 });
    }
    
    console.log('[AI-READY] Step 2/4: Analyzing HTML content...');
    const htmlStartTime = Date.now();
    
    // Analyze the HTML
    const htmlChecks = await analyzeHTML(html, metadata, url);
    console.log(`[AI-READY] Step 2/4: HTML analysis completed in ${Date.now() - htmlStartTime}ms`);
    
    console.log('[AI-READY] Step 3/4: Checking robots.txt, sitemap.xml, llms.txt...');
    const filesStartTime = Date.now();
    
    // Check additional files
    const fileChecks = await checkAdditionalFiles(url);
    console.log(`[AI-READY] Step 3/4: File checks completed in ${Date.now() - filesStartTime}ms`);
    
    console.log('[AI-READY] Step 4/4: Calculating final scores...');
    const scoreStartTime = Date.now();
    
    // Combine all checks
    const allChecks = [
      fileChecks.llms,
      fileChecks.robots,
      fileChecks.sitemap,
      ...htmlChecks
    ];
    
    // Calculate overall score with weighted categories
    // Refined weights based on benchmark testing
    const weights = {
      // Page-Level Metrics (Most important)
      'readability': 1.5,         // Important but not overwhelming
      'heading-structure': 1.4,    // Good signal
      'meta-tags': 1.2,            // Basic requirement
      
      // Domain-Level Checks (Moderate importance)
      'robots-txt': 0.9,
      'sitemap': 0.8,
      'llms-txt': 0.3,             // Very rare, minimal weight
      
      // Supporting Metrics
      'semantic-html': 1.0,
      'accessibility': 0.9
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const check of allChecks) {
      const weight = weights[check.id] || 1.0;
      weightedSum += check.score * weight;
      totalWeight += weight;
    }
    
    // Apply domain reputation bonus for known good sites
    const domain = new URL(url).hostname.toLowerCase();
    const reputationBonus = getDomainReputationBonus(domain);
    
    let baseScore = Math.round(weightedSum / totalWeight);
    
    // Boost score for sites with good content signals
    const contentSignals = allChecks.filter(c => 
      ['readability', 'heading-structure', 'meta-tags'].includes(c.id) && c.score >= 60
    ).length;
    
    // Add bonus for good content (up to 20 points)
    if (contentSignals >= 3) {
      baseScore += 15;
    } else if (contentSignals >= 2) {
      baseScore += 10;
    }
    
    // Ensure minimum viable score
    if (baseScore < 35 && allChecks.some(c => c.score >= 80)) {
      baseScore = 35; // Minimum 35% if any metric is excellent
    }
    
    const overallScore = Math.min(100, baseScore + reputationBonus);
    
    console.log(`[AI-READY] Step 4/4: Score calculation completed in ${Date.now() - scoreStartTime}ms`);
    console.log(`[AI-READY] Final scoring for ${domain}: base=${baseScore}, bonus=${reputationBonus}, final=${overallScore}`);
    console.log(`[AI-READY] Total analysis time: ${Date.now() - scrapeStartTime}ms`);
    
    return NextResponse.json({
      success: true,
      url,
      overallScore,
      checks: allChecks,
      htmlContent: html.substring(0, 10000), // Limit HTML for client transfer
      metadata: {
        title: metadata.title,
        description: metadata.description,
        analyzedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('AI Readiness analysis error:', error);
    return NextResponse.json(
      { error: 'ウェブサイトの分析に失敗しました' },
      { status: 500 }
    );
  }
}