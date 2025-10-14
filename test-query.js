// Test script to run a query and see full results
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
  console.log('\n🚀 Starting test query...\n');

  // Make API request
  const response = await fetch('http://localhost:3001/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'best digital marketing agency Switzerland',
      domain: 'mikgroup.ch',
      country: 'CH',
      language: 'en'
    })
  });

  const data = await response.json();
  console.log('✅ API Response:', data);
  console.log('\n⏳ Waiting for OpenAI to process (this takes ~20 seconds)...\n');

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 25000));

  // Fetch results
  const run = await prisma.run.findFirst({
    where: { id: data.run_id },
    include: { results: true },
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 QUERY RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🔍 Query Details:');
  console.log('   Keyword:', run.keyword);
  console.log('   Domain:', run.domain);
  console.log('   Country:', run.country);
  console.log('   Language:', run.language);
  console.log('');

  const result = run.results[0];
  console.log('🤖 OpenAI Response:');
  console.log('   Status:', result.status);
  console.log('   Mentioned:', result.mentioned ? '✅ YES' : '❌ NO');
  console.log('   Position:', result.firstIndex);
  console.log('   Latency:', result.latencyMs, 'ms');

  if (result.mentioned) {
    console.log('\n📝 Evidence Snippet:');
    console.log('  ', result.evidence);
  }

  console.log('\n📄 Full ChatGPT Response:');
  console.log('───────────────────────────────────────────────────────');
  console.log(result.rawResponse?.text || 'N/A');
  console.log('───────────────────────────────────────────────────────\n');
}

testQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
