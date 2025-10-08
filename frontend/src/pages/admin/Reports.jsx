import { useCallback, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import jsPDF from 'jspdf';
import '@style/Reports.css';

const Reports = () => {
  // State initialization
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    salesByPeriod: [],
    bestSellingProducts: [],
    categorySales: [],
    timeOfDaySales: [],
  });

  // Format currency utility
  const formatCurrency = useCallback((value) => {
    const num = typeof value === 'string' ? Number.parseFloat(value) : value;
    const formatted = new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isNaN(num) ? 0 : num);
    return `PHP ${formatted}`;
  }, []);

  // Generate report handler
  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const response = await fetch(
        `/api/Dashboard/Dashboard.php?action=fetch&startDate=${startDate}&endDate=${endDate}&reportType=${reportType}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch report data');
      }

      const { data } = result;

      setReportData({
        totalSales: data.systemStatus.totalSales,
        totalOrders: data.systemStatus.totalOrders,
        averageOrderValue: data.systemStatus.averageOrderValue,
        salesByPeriod: data.salesData.map((item) => ({
          period: item.period,
          orders: item.orders,
          revenue: item.sales,
        })),
        bestSellingProducts: data.bestSellingProducts,
        categorySales: data.categorySales,
        timeOfDaySales: data.timeOfDaySales,
      });
    } catch (err) {
      setError(`Failed to generate report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, reportType]);

  // Debounced report generation
  const debouncedGenerateReport = useMemo(
    () => debounce(handleGenerateReport, 500),
    [handleGenerateReport]
  );

  // Set date range for quick filters
  const setDateRange = useCallback(
    (range) => {
      const today = new Date();
      const newStartDate = new Date();

      switch (range) {
        case 'daily':
          setStartDate(today.toISOString().split('T')[0]);
          setEndDate(today.toISOString().split('T')[0]);
          break;
        case 'weekly':
          newStartDate.setDate(today.getDate() - 6);
          setStartDate(newStartDate.toISOString().split('T')[0]);
          setEndDate(today.toISOString().split('T')[0]);
          setReportType('daily');
          break;
        case 'monthly':
          newStartDate.setMonth(today.getMonth(), 1);
          setStartDate(newStartDate.toISOString().split('T')[0]);
          setEndDate(today.toISOString().split('T')[0]);
          setReportType('daily');
          break;
        case 'yearly':
          newStartDate.setFullYear(today.getFullYear(), 0, 1);
          setStartDate(newStartDate.toISOString().split('T')[0]);
          setEndDate(today.toISOString().split('T')[0]);
          setReportType('monthly');
          break;
        default:
          break;
      }
      debouncedGenerateReport();
    },
    [debouncedGenerateReport]
  );

  // Generate PDF report
  const generatePDF = useCallback(async () => {
    if (!reportData.salesByPeriod.length) {
      setError('Please generate a report before downloading.');
      return;
    }

    setLoading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15; // Increased margin for better spacing
      const contentWidth = pageWidth - 2 * margin; // Wider content area
      const lineHeight = 6;
      let yPosition = 15;

      const today = new Date();
      const formatDate = (d) =>
        new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

      const checkPageOverflow = (additionalHeight = 0) => {
        if (yPosition + additionalHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      const addDashedLine = () => {
        pdf.setLineWidth(0.3);
        pdf.setDrawColor(100); // Slightly lighter for aesthetics
        pdf.setLineDashPattern([1, 1], 0);
        pdf.line(margin, yPosition, margin + contentWidth, yPosition);
        pdf.setLineDashPattern([], 0);
        yPosition += lineHeight / 2;
      };

      // Header
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('ISLADELCAFE Coffee', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight;
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(
        'St. Vincent Street, Poblacion 1, Carcar City, Philippines',
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += lineHeight;
      pdf.text(
        `Generated on: ${today.toLocaleDateString()} ${today.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += lineHeight;
      pdf.text(
        `Report Period: ${formatDate(startDate)} to ${formatDate(endDate)}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += lineHeight;
      pdf.text(
        `Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
      yPosition += lineHeight;
      addDashedLine();
      checkPageOverflow();

      // Order Summary
      pdf.setFontSize(12).setFont('Helvetica', 'bold');
      pdf.text('Order Summary', margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont('Helvetica', 'normal').setFontSize(10);
      pdf.text(`Total Sales: ${formatCurrency(reportData.totalSales || 0)}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Total Orders: ${reportData.totalOrders || 0}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Average Order Value: ${formatCurrency(reportData.averageOrderValue || 0)}`, margin, yPosition);
      yPosition += lineHeight;
      addDashedLine();
      checkPageOverflow();

      // Sales Breakdown
      pdf.setFontSize(12).setFont('Helvetica', 'bold');
      pdf.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Sales Breakdown`, margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont('Helvetica', 'normal').setFontSize(10);

      if (reportData.salesByPeriod.length > 0) {
        // Table headers
        pdf.text('Period', margin, yPosition);
        pdf.text('Orders', margin + contentWidth * 0.5, yPosition, { align: 'right' });
        pdf.text('Revenue', margin + contentWidth * 0.75, yPosition, { align: 'right' });
        yPosition += lineHeight;
        addDashedLine();

        reportData.salesByPeriod.forEach((row) => {
          checkPageOverflow(lineHeight * 2); // Account for potential wrapped text
          const period = pdf.splitTextToSize(row.period || 'N/A', contentWidth * 0.45);
          pdf.text(period, margin, yPosition);
          pdf.text((row.orders || 0).toString(), margin + contentWidth * 0.5, yPosition, { align: 'right' });
          pdf.text(formatCurrency(row.revenue || 0), margin + contentWidth * 0.75, yPosition, { align: 'right' });
          yPosition += lineHeight * (period.length || 1); // Adjust for multi-line text
        });
      } else {
        pdf.text('No sales data available', margin, yPosition);
        yPosition += lineHeight;
      }
      addDashedLine();
      checkPageOverflow();

      // Best-Selling Products
      pdf.setFontSize(12).setFont('Helvetica', 'bold');
      pdf.text('Top Selling Products', margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont('Helvetica', 'normal').setFontSize(10);

      if (reportData.bestSellingProducts.length > 0) {
        pdf.text('Product Name', margin, yPosition);
        pdf.text('Qty', margin + contentWidth * 0.5, yPosition, { align: 'right' });
        pdf.text('Sales', margin + contentWidth * 0.75, yPosition, { align: 'right' });
        yPosition += lineHeight;
        addDashedLine();

        reportData.bestSellingProducts.forEach((product) => {
          checkPageOverflow(lineHeight * 2);
          const name = pdf.splitTextToSize(product.name || 'N/A', contentWidth * 0.45);
          pdf.text(name, margin, yPosition);
          pdf.text((product.quantity || 0).toString(), margin + contentWidth * 0.5, yPosition, { align: 'right' });
          pdf.text(formatCurrency(product.sales || 0), margin + contentWidth * 0.75, yPosition, { align: 'right' });
          yPosition += lineHeight * (name.length || 1);
        });
      } else {
        pdf.text('No product data available', margin, yPosition);
        yPosition += lineHeight;
      }
      addDashedLine();
      checkPageOverflow();

      // Category Sales
      pdf.setFontSize(12).setFont('Helvetica', 'bold');
      pdf.text('Sales by Category', margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont('Helvetica', 'normal').setFontSize(10);

      if (reportData.categorySales.length > 0) {
        pdf.text('Category Name', margin, yPosition);
        pdf.text('Orders', margin + contentWidth * 0.5, yPosition, { align: 'right' });
        pdf.text('Sales', margin + contentWidth * 0.75, yPosition, { align: 'right' });
        yPosition += lineHeight;
        addDashedLine();

        reportData.categorySales.forEach((category) => {
          checkPageOverflow(lineHeight * 2);
          const name = pdf.splitTextToSize(category.name || 'N/A', contentWidth * 0.45);
          pdf.text(name, margin, yPosition);
          pdf.text((category.orders || 0).toString(), margin + contentWidth * 0.5, yPosition, { align: 'right' });
          pdf.text(formatCurrency(category.sales || 0), margin + contentWidth * 0.75, yPosition, { align: 'right' });
          yPosition += lineHeight * (name.length || 1);
        });
      } else {
        pdf.text('No category data available', margin, yPosition);
        yPosition += lineHeight;
      }
      addDashedLine();
      checkPageOverflow();

      // Footer
      pdf.setFont('Helvetica', 'normal').setFontSize(10);
      pdf.text('Thank you for choosing ISLADELCAFE!', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight;
      pdf.text(`Generated: ${today.toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });

      const safeStart = formatDate(startDate).replace(/[^0-9A-Za-z]/g, '-');
      const safeEnd = formatDate(endDate).replace(/[^0-9A-Za-z]/g, '-');

      // Download the PDF
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `ISLADELCAFE_SalesReport_${reportType}_${safeStart}_${safeEnd}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [reportData, startDate, endDate, reportType, formatCurrency]);

  // Print report handler
  const handlePrint = useCallback(() => {
    if (!reportData.salesByPeriod.length) {
      setError('Please generate a report before printing.');
      return;
    }

    try {
      const reportElement = document.getElementById('report-content');
      const reportHtml = reportElement.innerHTML;

      const windowContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Sales Report</title>
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 12pt;
                margin: 0;
                padding: 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th, td {
                border: 1px solid #000;
                padding: 6px 8px;
                text-align: left;
              }
              th {
                background: #f2f2f2;
              }
              h1, h2, h3 {
                margin: 0;
                padding: 5px 0;
                text-align: center;
              }
            </style>
          </head>
          <body>
            ${reportHtml}
          </body>
        </html>
      `;

      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.open();
      printWindow.document.write(windowContent);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    } catch (err) {
      setError('Failed to print report: ' + err.message);
    }
  }, [reportData.salesByPeriod]);

  // Paginated sales data
  const paginatedSalesData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return reportData.salesByPeriod.slice(startIndex, endIndex);
  }, [reportData.salesByPeriod, currentPage]);

  const pageCount = Math.ceil(reportData.salesByPeriod.length / rowsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="reports-container">
      {/* Header */ }
      <div className="reports-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="reports-title">Sales Reports</h1>
            <p className="reports-subtitle">Analyze your coffee shop's performance</p>
          </div>
        </div>
      </div>

      {/* Report Configuration */ }
      <div className="controls-card">
        <div className="controls-header">
          <h3>Report Configuration</h3>
        </div>
        <div className="controls-content">
          <div className="date-controls">
            <div className="date-input-group">
              <label htmlFor="start-date">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={ startDate }
                onChange={ (e) => {
                  setStartDate(e.target.value);
                  debouncedGenerateReport();
                } }
                className="date-input"
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="end-date">End Date</label>
              <input
                id="end-date"
                type="date"
                value={ endDate }
                onChange={ (e) => {
                  setEndDate(e.target.value);
                  debouncedGenerateReport();
                } }
                className="date-input"
              />
            </div>
            <button
              onClick={ debouncedGenerateReport }
              disabled={ loading }
              className="generate-btn"
              type="button"
            >
              { loading ? 'Generating...' : 'Generate Report' }
            </button>
          </div>
          <div className="quick-filters">
            <button
              onClick={ () => setDateRange('daily') }
              disabled={ loading }
              className="filter-btn"
              type="button"
            >
              Daily
            </button>
            <button
              onClick={ () => setDateRange('weekly') }
              disabled={ loading }
              className="filter-btn"
              type="button"
            >
              Weekly
            </button>
            <button
              onClick={ () => setDateRange('monthly') }
              disabled={ loading }
              className="filter-btn"
              type="button"
            >
              Monthly
            </button>
            <button
              onClick={ () => setDateRange('yearly') }
              disabled={ loading }
              className="filter-btn"
              type="button"
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */ }
      { error && (
        <div className="error-alert">
          <span>Error: { error }</span>
          <button onClick={ () => setError(null) } className="error-close" type="button">
            Close
          </button>
        </div>
      ) }

      {/* Report Content */ }
      <div id="report-content" className="report-content">
        <div className="report-header">
          <h2 className="report-title">Coffee Shop Sales Report</h2>
          <p className="report-period">
            Period: { new Date(startDate).toLocaleDateString() } to{ ' ' }
            { new Date(endDate).toLocaleDateString() }
          </p>
        </div>

        {/* Sales Summary */ }
        <div className="summary-section">
          <h3 className="section-title">Sales Summary</h3>
          <div className="summary-grid">
            <div className="summary-card total-sales">
              <div className="card-content">
                <h4>Total Sales</h4>
                <p className="card-value">{ formatCurrency(reportData.totalSales) }</p>
              </div>
            </div>
            <div className="summary-card total-orders">
              <div className="card-content">
                <h4>Total Orders</h4>
                <p className="card-value">{ reportData.totalOrders }</p>
              </div>
            </div>
            <div className="summary-card avg-order">
              <div className="card-content">
                <h4>Average Order Value</h4>
                <p className="card-value">{ formatCurrency(reportData.averageOrderValue) }</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Breakdown */ }
        <div className="table-section">
          <h3 className="section-title">{ reportType.charAt(0).toUpperCase() + reportType.slice(1) } Sales Breakdown</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                { paginatedSalesData.length > 0 ? (
                  paginatedSalesData.map((row, index) => (
                    <tr key={ `${row.period}-${index}` }>
                      <td>{ row.period }</td>
                      <td>{ row.orders }</td>
                      <td className="revenue-cell">{ formatCurrency(row.revenue) }</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={ 3 } className="no-data">
                      No data available
                    </td>
                  </tr>
                ) }
              </tbody>
            </table>
            { pageCount > 1 && (
              <div className="pagination">
                <button
                  onClick={ () => handlePageChange(currentPage - 1) }
                  disabled={ currentPage === 1 }
                  className="pagination-btn"
                  type="button"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page { currentPage } of { pageCount }
                </span>
                <button
                  onClick={ () => handlePageChange(currentPage + 1) }
                  disabled={ currentPage === pageCount }
                  className="pagination-btn"
                  type="button"
                >
                  Next
                </button>
              </div>
            ) }
          </div>
        </div>

        {/* Best Selling Products */ }
        <div className="table-section">
          <h3 className="section-title">Best Selling Products</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                { reportData.bestSellingProducts.length > 0 ? (
                  reportData.bestSellingProducts.map((product, index) => (
                    <tr key={ `${product.name}-${index}` }>
                      <td>{ product.name }</td>
                      <td>{ product.quantity }</td>
                      <td className="revenue-cell">{ formatCurrency(product.sales) }</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={ 3 } className="no-data">
                      No data available
                    </td>
                  </tr>
                ) }
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales by Category */ }
        <div className="table-section">
          <h3 className="section-title">Sales by Category</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Orders</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                { reportData.categorySales.length > 0 ? (
                  reportData.categorySales.map((category, index) => (
                    <tr key={ `${category.name}-${index}` }>
                      <td>{ category.name }</td>
                      <td>{ category.orders }</td>
                      <td className="revenue-cell">{ formatCurrency(category.sales) }</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={ 3 } className="no-data">
                      No data available
                    </td>
                  </tr>
                ) }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */ }
      { reportData.salesByPeriod.length > 0 && (
        <div className="action-buttons">
          <button
            onClick={ handlePrint }
            disabled={ loading }
            className="action-btn print-btn"
            type="button"
          >
            { loading ? 'Printing...' : 'Print Report' }
          </button>
          <button
            onClick={ generatePDF }
            disabled={ loading }
            className="action-btn download-btn"
            type="button"
          >
            { loading ? 'Generating PDF...' : 'Download PDF' }
          </button>
        </div>
      ) }
    </div>
  );
};

export default Reports;
