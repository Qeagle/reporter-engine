import FailureAnalysisService from './server/services/FailureAnalysisService.js';

try {
  const service = new FailureAnalysisService();
  const result = service.getSummary(1, { timeWindow: '30' });
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
