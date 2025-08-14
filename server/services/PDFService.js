import { jsPDF } from 'jspdf';


class PDFService {
  async generateReportPDF(report) {
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Helper function to wrap text
    const wrapText = (text, maxWidth) => {
      return doc.splitTextToSize(text.toString(), maxWidth);
    };
    
    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > 280) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };
    
    // Helper function to add a colored header box
    const addHeaderBox = (text, color = [52, 152, 219]) => {
      doc.setFillColor(...color);
      doc.roundedRect(15, yPosition - 5, 180, 15, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(text, 20, yPosition + 5);
      doc.setTextColor(0, 0, 0);
      yPosition += 20;
    };
    
    // Helper function to add status badge
    const addStatusBadge = (status, x, y) => {
      const colors = {
        'passed': [46, 204, 113],
        'failed': [231, 76, 60],
        'skipped': [241, 196, 15],
        'pending': [155, 89, 182]
      };
      const color = colors[status.toLowerCase()] || [149, 165, 166];
      
      doc.setFillColor(...color);
      doc.roundedRect(x, y - 3, 20, 8, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(status.toUpperCase(), x + 2, y + 2);
      doc.setTextColor(0, 0, 0);
    };
    
    // Title Page
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 0, 210, 60, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST REPORT', 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report ID: ${report.id}`, 105, 45, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPosition = 80;
    
    // Report Information Section
    addHeaderBox('Report Information', [52, 152, 219]);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const reportInfo = [
      ['Test Suite:', report.testSuite || 'N/A'],
      ['Environment:', report.environment || 'N/A'],
      ['Framework:', report.framework || 'N/A'],
      ['Started:', new Date(report.startTime).toLocaleString()],
      ['Finished:', new Date(report.endTime).toLocaleString()],
      ['Duration:', `${report.duration || 0}ms`]
    ];
    
    reportInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      
      // Wrap the value text if it's too long
      const wrappedValue = wrapText(value, contentWidth - 50);
      wrappedValue.forEach((line, index) => {
        doc.text(line, 70, yPosition + (index * 8));
      });
      yPosition += Math.max(8, wrappedValue.length * 8);
    });
    
    yPosition += 10;
    
    // Summary Section
    checkNewPage(80);
    addHeaderBox('Test Summary', [46, 204, 113]);
    
    const summary = report.summary || {};
    const total = summary.total || 0;
    const passed = summary.passed || 0;
    const failed = summary.failed || 0;
    const skipped = summary.skipped || 0;
    
    // Summary stats in boxes
    const summaryBoxes = [
      { label: 'Total', value: total, color: [52, 152, 219] },
      { label: 'Passed', value: passed, color: [46, 204, 113] },
      { label: 'Failed', value: failed, color: [231, 76, 60] },
      { label: 'Skipped', value: skipped, color: [241, 196, 15] }
    ];
    
    summaryBoxes.forEach((box, index) => {
      const x = 20 + (index * 42);
      doc.setFillColor(...box.color);
      doc.roundedRect(x, yPosition, 35, 25, 3, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(box.value.toString(), x + 17.5, yPosition + 12, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(box.label, x + 17.5, yPosition + 20, { align: 'center' });
    });
    
    doc.setTextColor(0, 0, 0);
    yPosition += 35;
    
    // Pass rate
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    doc.text(`Pass Rate: ${passRate}%`, 20, yPosition);
    
    // Draw pass rate bar
    const barWidth = 160;
    const barHeight = 10;
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPosition + 5, barWidth, barHeight);
    
    if (passRate > 0) {
      const fillWidth = (passRate / 100) * barWidth;
      const barColor = passRate >= 80 ? [46, 204, 113] : passRate >= 60 ? [241, 196, 15] : [231, 76, 60];
      doc.setFillColor(...barColor);
      doc.rect(20, yPosition + 5, fillWidth, barHeight, 'F');
    }
    
    yPosition += 25;
    
    // Test Cases Section
    checkNewPage(50);
    addHeaderBox('Test Cases Details', [155, 89, 182]);
    
    doc.setFontSize(10);
    
    report.tests.forEach((test, index) => {
      checkNewPage(60);
      
      // Test case header with alternating background
      const bgColor = index % 2 === 0 ? [248, 249, 250] : [255, 255, 255];
      doc.setFillColor(...bgColor);
      doc.rect(15, yPosition - 3, 180, 35, 'F');
      
      // Test number and name - with wrapping
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const testName = `${index + 1}. ${test.name || 'Unnamed Test'}`;
      const wrappedTestName = wrapText(testName, contentWidth - 40);
      wrappedTestName.forEach((line, lineIndex) => {
        doc.text(line, 20, yPosition + 3 + (lineIndex * 10));
      });
      
      // Status badge
      addStatusBadge(test.status || 'unknown', 160, yPosition + 3);
      
      // Test details
      const nameHeight = wrappedTestName.length * 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Duration: ${test.duration || 0}ms`, 20, yPosition + 3 + nameHeight + 5);
      
      let errorHeight = 0;
      if (test.error) {
        doc.setTextColor(231, 76, 60);
        const wrappedError = wrapText(`Error: ${test.error}`, contentWidth - 10);
        wrappedError.forEach((line, lineIndex) => {
          doc.text(line, 20, yPosition + 3 + nameHeight + 13 + (lineIndex * 8));
        });
        errorHeight = wrappedError.length * 8;
        doc.setTextColor(0, 0, 0);
      }
      
      yPosition += Math.max(35, nameHeight + errorHeight + 20);
      
      // Test steps
      if (test.steps && test.steps.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Steps:', 25, yPosition);
        yPosition += 8;
        
        test.steps.forEach((step, stepIndex) => {
          checkNewPage(20);
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          
          // Step number and action - with wrapping
          const stepText = `${stepIndex + 1}. ${step.action || step.name || 'Step'}`;
          const wrappedStepText = wrapText(stepText, contentWidth - 40);
          wrappedStepText.forEach((line, lineIndex) => {
            doc.text(line, 30, yPosition + (lineIndex * 7));
          });
          
          // Step status
          if (step.status) {
            addStatusBadge(step.status, 160, yPosition);
          }
          
          yPosition += Math.max(6, wrappedStepText.length * 7);
          
          // Step details with wrapping
          if (step.expected) {
            doc.setTextColor(100, 100, 100);
            const wrappedExpected = wrapText(`Expected: ${step.expected}`, contentWidth - 20);
            wrappedExpected.forEach((line, lineIndex) => {
              doc.text(line, 35, yPosition + (lineIndex * 6));
            });
            yPosition += wrappedExpected.length * 6;
          }
          
          if (step.actual) {
            const wrappedActual = wrapText(`Actual: ${step.actual}`, contentWidth - 20);
            wrappedActual.forEach((line, lineIndex) => {
              doc.text(line, 35, yPosition + (lineIndex * 6));
            });
            yPosition += wrappedActual.length * 6;
          }
          
          doc.setTextColor(0, 0, 0);
          yPosition += 3;
        });
        
        yPosition += 5;
      }
      
      yPosition += 5;
    });
    
    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 285, 195, 285);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 290);
      doc.text(`Page ${i} of ${pageCount}`, 170, 290);
    }
    
    // Return PDF as buffer
    return Buffer.from(doc.output('arraybuffer'));
  }

  generateMockPDF(report) {
    // Legacy method - keeping for backwards compatibility
    return `
      Test Report PDF - ${report.id}
      
      Test Suite: ${report.testSuite}
      Environment: ${report.environment}
      Framework: ${report.framework}
      
      Summary:
      - Total Tests: ${report.summary.total}
      - Passed: ${report.summary.passed}
      - Failed: ${report.summary.failed}
      - Skipped: ${report.summary.skipped}
      - Pass Rate: ${report.summary.passRate}%
      
      Test Details:
      ${report.tests.map(test => `
        ${test.name}: ${test.status} (${test.duration}ms)
      `).join('')}
      
      Generated on: ${new Date().toISOString()}
    `;
  }
}

export default PDFService;