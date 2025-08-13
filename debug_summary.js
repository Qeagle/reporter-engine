import FailureAnalysisService from './server/services/FailureAnalysisService.js';

try {
  const service = new FailureAnalysisService();
  console.log('Testing getSummary method...');
  const result = service.getSummary(1, { timeWindow: '30' });
  console.log('Summary result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error in getSummary:', error.message);
  console.error('Stack:', error.stack);
}

try {
  console.log('\nTesting getTestCaseFailures method...');
  const service2 = new FailureAnalysisService();
  const result2 = service2.getTestCaseFailures(1, { timeWindow: '30' });
  console.log('Test cases count:', result2.length);
} catch (error) {
  console.error('Error in getTestCaseFailures:', error.message);
}
