// Test suite for AI Readiness scoring
// These sites should all score well despite varying technical implementations

export const testSites = [
  {
    url: 'https://vercel.com',
    expectedMinScore: 75,
    description: 'Modern Next.js site with excellent performance'
  },
  {
    url: 'https://stripe.com',
    expectedMinScore: 80,
    description: 'Well-structured API documentation and content'
  },
  {
    url: 'https://docs.github.com',
    expectedMinScore: 85,
    description: 'Comprehensive developer documentation'
  },
  {
    url: 'https://openai.com',
    expectedMinScore: 75,
    description: 'AI company with modern web presence'
  },
  {
    url: 'https://www.anthropic.com',
    expectedMinScore: 75,
    description: 'AI safety company website'
  },
  {
    url: 'https://tailwindcss.com',
    expectedMinScore: 70,
    description: 'Modern documentation site'
  },
  {
    url: 'https://react.dev',
    expectedMinScore: 80,
    description: 'React documentation'
  },
  {
    url: 'https://nextjs.org',
    expectedMinScore: 80,
    description: 'Next.js framework documentation'
  }
];

// Sites that might score lower but are still valid
export const challengingSites = [
  {
    url: 'https://news.ycombinator.com',
    expectedMinScore: 40,
    expectedMaxScore: 60,
    description: 'Minimal HTML, but highly crawlable'
  },
  {
    url: 'https://example.com',
    expectedMinScore: 30,
    expectedMaxScore: 50,
    description: 'Basic HTML page'
  }
];

// Test function to validate scoring
export async function testScoring() {
  const results = [];
  
  for (const site of testSites) {
    try {
      const response = await fetch('/api/ai-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url })
      });
      
      const data = await response.json();
      
      const passed = data.overallScore >= site.expectedMinScore;
      
      results.push({
        site: site.url,
        expected: site.expectedMinScore,
        actual: data.overallScore,
        passed,
        message: passed 
          ? `✅ ${site.description} scored ${data.overallScore}% (expected ≥${site.expectedMinScore}%)`
          : `❌ ${site.description} scored ${data.overallScore}% (expected ≥${site.expectedMinScore}%)`
      });
      
    } catch (error) {
      results.push({
        site: site.url,
        passed: false,
        message: `❌ Error testing ${site.url}: ${error.message}`
      });
    }
  }
  
  return results;
}