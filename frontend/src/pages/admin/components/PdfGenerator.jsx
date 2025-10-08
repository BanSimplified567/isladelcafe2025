import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import '@style/OrderDetails.css'; // Adjusted import path for clarity

// Reusable PDF Generator Component
const PDFGenerator = ({ order, orderItems }) => {
  const generatePDF = async (isPrint = false) => {
    if (!order || !orderItems?.length) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Order details or items are not loaded. Please try again.',
      });
      return;
    }

    try {
      const pageWidth = 80; // mm
      const margin = 5;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 4;
      const maxPageHeight = 297; // A4 height in mm

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, maxPageHeight],
      });

      // Use a standard font available in jsPDF
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(10);

      let yPos = margin;

      // Header
      pdf.setFontSize(12);
      pdf.text('IslaDelCafe', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      pdf.setFontSize(10);
      pdf.text(`Order #${order.order_number ?? 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;

      // Store Info
      pdf.setFontSize(8);
      pdf.text('Carcar City, Cebu', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      pdf.text('Tel: (+63) 97-5188-3932', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      pdf.text('Email: isladelcafe@gmail.com', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight + 2;

      pdf.text('-'.repeat(Math.floor(contentWidth / 2)), margin, yPos);
      yPos += lineHeight;

      // Customer Info
      pdf.setFontSize(8);
      pdf.text(`Sold to: ${order.first_name ?? ''} ${order.last_name ?? ''}`, margin, yPos);
      yPos += lineHeight;
      const address = `${order.address ?? ''}, ${order.city ?? ''}, ${order.zipcode ?? ''}`;
      const addressLines = pdf.splitTextToSize(address.trim() || 'N/A', contentWidth);
      addressLines.forEach((line) => {
        pdf.text(line, margin, yPos);
        yPos += lineHeight;
      });
      pdf.text(`Phone: ${order.phone ?? 'N/A'}`, margin, yPos);
      yPos += lineHeight;
      const emailLines = pdf.splitTextToSize(`Email: ${order.email ?? 'N/A'}`, contentWidth);
      emailLines.forEach((line) => {
        pdf.text(line, margin, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight;

      // Order Date
      const formattedDate = order.created_at
        ? new Date(order.created_at).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
        : 'N/A';
      pdf.text(`Date: ${formattedDate}`, margin, yPos);
      yPos += lineHeight + 2;

      // Order Items
      pdf.setFontSize(10);
      pdf.text('ORDER SUMMARY', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      pdf.setFontSize(8);
      pdf.text('Item', margin, yPos);
      pdf.text('Qty', margin + 30, yPos);
      pdf.text('Price', margin + 40, yPos);
      pdf.text('Total', pageWidth - margin, yPos, { align: 'right' });
      yPos += 3;
      pdf.text('-'.repeat(Math.floor(contentWidth / 2)), margin, yPos);
      yPos += 3;

      orderItems.forEach((item) => {
        const productName = `${item.product_name ?? 'Unknown'} (${item.size ?? 'N/A'})`;
        const lines = pdf.splitTextToSize(productName, 28);
        const itemHeight = lines.length * lineHeight + 2;

        // Check for page overflow
        if (yPos + itemHeight + 20 > maxPageHeight - margin) {
          pdf.addPage([pageWidth, maxPageHeight]);
          yPos = margin;
        }

        lines.forEach((line, lineIndex) => {
          if (lineIndex === 0) {
            pdf.text(line, margin, yPos);
            pdf.text((item.quantity ?? 0).toString(), margin + 30, yPos);
            pdf.text(`${parseFloat(item.price ?? 0).toFixed(2)}`, margin + 40, yPos);
            pdf.text(
              `${(parseFloat(item.price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`,
              pageWidth - margin,
              yPos,
              { align: 'right' }
            );
          } else {
            pdf.text(line, margin + 2, yPos);
          }
          yPos += lineHeight;
        });
        yPos += 2;
      });

      yPos += 3;
      pdf.text('-'.repeat(Math.floor(contentWidth / 2)), margin, yPos);
      yPos += lineHeight;

      // Total
      pdf.setFontSize(10);
      pdf.text('Total:', margin + 40, yPos, { align: 'right' });
      pdf.text(
        `${parseFloat(order.total_amount ?? 0).toFixed(2)}`,
        pageWidth - margin,
        yPos,
        { align: 'right' }
      );
      yPos += lineHeight + 2;

      // Payment Method
      pdf.setFontSize(8);
      pdf.text(`Payment: ${order.payment_method ?? 'N/A'}`, margin, yPos);
      yPos += lineHeight + 2;

      // Footer
      pdf.text('Thank you for choosing IslaDelCafe!', pageWidth / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      pdf.text('No returns without receipt', pageWidth / 2, yPos, { align: 'center' });

      if (isPrint) {
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');
        if (!printWindow) {
          throw new Error('Failed to open print window. Please allow pop-ups.');
        }
        // Use setTimeout to ensure the window is ready
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        }, 500);
      } else {
        pdf.save(`Receipt_${order.order_number ?? 'unknown'}.pdf`);
      }
    } catch (err) {
      console.error('Receipt generation error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to generate receipt: ${err.message}. Please try again.`,
      });
    }
  };

  return (
    <div className="pdf-generator-buttons">
      <button
        onClick={ () => generatePDF() }
        className="order-details-download-button"
        aria-label="Download order receipt"
        title="Download receipt as PDF"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="order-details-download-icon"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={ { width: '1.25rem', height: '1.25rem' } }
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L10 11.586V6a1 1 0 112 0v5.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        Download PDF
      </button>
      <button
        onClick={ () => generatePDF(true) }
        className="order-details-print-button"
        aria-label="Print order receipt"
        title="Print order receipt"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="order-details-print-icon"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={ { width: '1.25rem', height: '1.25rem' } }
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5 4v3a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm10 8H5v4a2 2 0 002 2h6a2 2 0 002-2v-4zm-3-6a1 1 0 011 1v1a1 1 0 01-1 1h-2a1 1 0 01-1-1V7a1 1 0 011-1h2z"
            clipRule="evenodd"
          />
        </svg>
        Print Receipt
      </button>
    </div>
  );
};

export default PDFGenerator;
