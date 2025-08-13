import FailureAnalysisService from './server/services/FailureAnalysisService.js';

try {
  const service = new FailureAnalysisService();
  
  console.log('=== Testing Summary vs Individual Classifications ===\n');
  
  // Get summary
  const summary = service.getSummary(1, { timeWindow: '30' });
  console.log('SUMMARY:', JSON.stringify(summary, null, 2));
  
  // Get individual test cases
  const testCases = service.getTestCaseFailures(1, { timeWindow: '30' });
  console.log(`\nINDIVIDUAL TEST CASES (${testCases.length} total):`);
  
  // Count classifications from individual test cases
  const counts = {};
  testCases.forEach((testCase, index) => {
    const primaryClass = testCase.primaryClass || 'Unclassified';
    counts[primaryClass] = (counts[primaryClass] || 0) + 1;
    
    if (index < 5) { // Show first 5 for debugging
      console.log(`${index + 1}. ${testCase.testName.substring(0, 50)}...`);
      console.log(`   Primary: ${testCase.primaryClass}, Sub: ${testCase.subClass}, Confidence: ${testCase.confidence}`);
      console.log(`   Error: ${testCase.errorMessage?.substring(0, 100)}...`);
      console.log('');
    }
  });
  
  console.log('INDIVIDUAL COUNTS:', counts);
  console.log('\nCOMPARISON:');
  console.log('Summary says:');
  console.log(`  - Automation Errors: ${summary.automationErrors}`);
  console.log(`  - Data Issues: ${summary.dataIssues}`);
  console.log(`  - Environment Issues: ${summary.environmentIssues}`);
  console.log(`  - Application Defects: ${summary.applicationDefects}`);
  console.log(`  - Unknown Failures: ${summary.unknownFailures}`);
  
  console.log('Individual test cases say:');
  Object.entries(counts).forEach(([key, value]) => {
    console.log(`  - ${key}: ${value}`);
  });

} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
