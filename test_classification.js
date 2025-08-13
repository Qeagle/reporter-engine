import FailureAnalysisService from './server/services/FailureAnalysisService.js';

try {
  const service = new FailureAnalysisService();
  
  // Test the raw classification on individual error messages
  console.log('=== Testing Raw Classification ===\n');
  
  // Get one test case from database to see raw data
  const testCase1 = {
    error_message: "Error: expect(received).toBeFalsy()\n\nReceived: true",
    stack_trace: "Error: expect(received).toBeFalsy()\n\nReceived: true\n    at /Users/babu/Desktop/playwright-salesforce/tests/smoke/deletelead.spec.ts:33:21"
  };
  
  const testCase2 = {
    error_message: "TimeoutError: locator.waitFor: Timeout 15000ms exceeded.\nCall log:\n  - waiting for locator('mark:text-is(\\'Leads\\')') to be visible",
    stack_trace: "TimeoutError: locator.waitFor: Timeout 15000ms exceeded.\nCall log:\n  - waiting for locator('mark:text-is(\\'Leads\\')') to be visible\n\n    at WebElement.safeAction (/Users/babu/Desktop/playwright-salesforce/elements/WebElement.ts:27:28)"
  };
  
  const testCase3 = {
    error_message: "Error: ENOENT: no such file or directory, open './createdLead.json'",
    stack_trace: "Error: ENOENT: no such file or directory, open './createdLead.json'\n    at /Users/babu/Desktop/playwright-salesforce/tests/smoke/deletelead.spec.ts:12:40"
  };
  
  console.log('Test Case 1 (expect.toBeFalsy):');
  const result1 = service.classifyFailure(testCase1);
  console.log(JSON.stringify(result1, null, 2));
  
  console.log('\nTest Case 2 (TimeoutError):');
  const result2 = service.classifyFailure(testCase2);
  console.log(JSON.stringify(result2, null, 2));
  
  console.log('\nTest Case 3 (ENOENT):');
  const result3 = service.classifyFailure(testCase3);
  console.log(JSON.stringify(result3, null, 2));

} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
