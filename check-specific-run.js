// Check specific run result
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRun() {
  const run = await prisma.run.findFirst({
    where: { id: 'cmgphykw20003u8w1z8r5boqp' },
    include: { results: true },
  });

  if (!run) {
    console.log('❌ Run not found!');
    return;
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 RUN DETAILS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🔍 Query:');
  console.log('   Keyword:', run.keyword);
  console.log('   Domain:', run.domain);
  console.log('   Country:', run.country);
  console.log('   Language:', run.language);
  console.log('   Created:', run.createdAt);
  console.log('');

  if (run.results.length === 0) {
    console.log('⏳ No results yet - still processing...');
    return;
  }

  const result = run.results[0];
  console.log('🤖 OpenAI Result:');
  console.log('   Provider:', result.provider);
  console.log('   Status:', result.status);
  console.log('   Mentioned:', result.mentioned ? '✅ YES' : '❌ NO');
  console.log('   Position:', result.firstIndex);
  console.log('   Latency:', result.latencyMs, 'ms');

  if (result.mentioned && result.evidence) {
    console.log('\n📝 Evidence Snippet:');
    console.log('  ', result.evidence);
  }

  console.log('\n📄 Full ChatGPT Response:');
  console.log('───────────────────────────────────────────────────────');
  console.log(result.rawResponse?.text || 'N/A');
  console.log('───────────────────────────────────────────────────────\n');
}

checkRun()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
