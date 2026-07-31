import { InvoiceData } from './InvoicePrintTemplate';
import { formatINR } from '../../lib/booking';

/**
 * Generates a self-contained HTML string for an invoice.
 * Used to open in a new window for printing/saving as PDF.
 */
function buildInvoiceHTML(data: InvoiceData): string {
    const roomPrice = data.roomPrice ?? data.subtotal;
    const discount = data.discount ?? 0;
    const taxableValue = data.taxableValue ?? Math.max(0, roomPrice - discount);
    const gstAmount = data.gstAmount;
    const totalBookingAmount = data.totalAmount ?? (taxableValue + gstAmount);
    const commissionAmount = data.commissionAmount ?? Math.round(taxableValue * 0.12);
    const amountPayableToProperty = data.amountPayableToProperty ?? (totalBookingAmount - commissionAmount);

    const fmt = (num: number) => `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1f2937;
          background: #fff;
          padding: 40px 50px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 24px; }
        .hotel-name { font-size: 24px; font-weight: 800; color: #0c4a6e; margin-bottom: 4px; }
        .hotel-detail { font-size: 12px; color: #6b7280; line-height: 1.5; }
        .inv-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; text-align: right; color: #111827; }
        .inv-meta { font-size: 12px; color: #4b5563; text-align: right; line-height: 1.5; }
        .inv-meta span { font-weight: 600; color: #111827; }
        .section-label { font-size: 10px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .guest-name { font-size: 16px; font-weight: 700; color: #1f2937; }
        .guest-detail { font-size: 12px; color: #4b5563; margin-top: 2px; }
        .bill-to { margin-bottom: 28px; }
        
        .bill-box {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          background: #f9fafb;
          margin-bottom: 24px;
        }
        .bill-box-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .bill-box-title { font-size: 15px; font-weight: 700; color: #111827; }
        .bill-box-badge { font-size: 11px; font-family: monospace; color: #6b7280; }

        table { width: 100%; border-collapse: collapse; }
        th { font-size: 12px; font-weight: 600; color: #4b5563; text-align: left; padding: 8px 0; border-bottom: 1px solid #d1d5db; }
        th.right { text-align: right; }
        td { font-size: 13px; color: #374151; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        td.right { text-align: right; font-variant-numeric: tabular-nums; }
        .bold { font-weight: 700; color: #111827; }
        .highlight-row { background: #f3f4f6; font-weight: 700; }
        .highlight-row td { padding: 12px 8px; font-size: 14px; color: #0c4a6e; }
        .payable-row { background: #ecfdf5; font-weight: 800; }
        .payable-row td { padding: 12px 8px; font-size: 14px; color: #065f46; }
        .discount-text { color: #dc2626; }
        .commission-text { color: #b45309; }

        .footer { text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; margin-top: 36px; }
        .footer-title { font-size: 15px; font-weight: 700; color: #0c4a6e; margin-bottom: 4px; }
        .footer-text { font-size: 11px; color: #6b7280; }
        .footer-small { font-size: 10px; color: #9ca3af; margin-top: 12px; }
        @media print {
          body { padding: 15px 25px; }
          @page { margin: 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="hotel-name">${data.hotelName || 'Triplooper Resort'}</div>
          <div class="hotel-detail" style="white-space: pre-wrap;">${data.hotelAddress || 'Hotel Address'}</div>
          <div class="hotel-detail">${data.hotelEmail || 'contact@hotel.com'}</div>
          <div class="hotel-detail">${data.hotelPhone || '+91 0000 0000'}</div>
        </div>
        <div>
          <div class="inv-title">INVOICE STATEMENT</div>
          <div class="inv-meta">Inv. No: <span>${data.invoiceNumber}</span></div>
          <div class="inv-meta">Date: <span>${data.date}</span></div>
          <div class="inv-meta">Booking Ref: <span>${data.bookingId}</span></div>
        </div>
      </div>

      <div class="bill-to">
        <div class="section-label">Bill To</div>
        <div class="guest-name">${data.guestName}</div>
        ${data.guestLocation ? `<div class="guest-detail">${data.guestLocation}</div>` : ''}
        ${data.guestPhone ? `<div class="guest-detail">${data.guestPhone}</div>` : ''}
        ${data.guestEmail ? `<div class="guest-detail">${data.guestEmail}</div>` : ''}
      </div>

      <!-- 1. Customer Tax Bill -->
      <div class="bill-box">
        <div class="bill-box-header">
          <div class="bill-box-title">1. Customer Tax Bill</div>
          <div class="bill-box-badge">Customer Copy</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Particulars</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Room Charges</td>
              <td class="right">${fmt(roomPrice)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td>Discount</td>
              <td class="right discount-text">-${fmt(discount)}</td>
            </tr>` : ''}
            <tr>
              <td class="bold">Taxable Value</td>
              <td class="right bold">${fmt(taxableValue)}</td>
            </tr>
            <tr>
              <td>GST @12%</td>
              <td class="right">${fmt(gstAmount)}</td>
            </tr>
            <tr class="highlight-row">
              <td>Grand Total</td>
              <td class="right">${fmt(totalBookingAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 2. Property Settlement Bill -->
      <div class="bill-box">
        <div class="bill-box-header">
          <div class="bill-box-title">Property Settlement Bill</div>
          <div class="bill-box-badge">To property</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Particulars</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Room Price</td>
              <td class="right">${fmt(roomPrice)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td>Discount</td>
              <td class="right discount-text">-${fmt(discount)}</td>
            </tr>` : ''}
            <tr>
              <td class="bold">Commissionable Amount</td>
              <td class="right bold">${fmt(taxableValue)}</td>
            </tr>
            <tr>
              <td>GST @12%</td>
              <td class="right">${fmt(gstAmount)}</td>
            </tr>
            <tr class="bold">
              <td>Total Booking Amount</td>
              <td class="right">${fmt(totalBookingAmount)}</td>
            </tr>
            <tr>
              <td>Less: Triplooper Commission (12% of ${fmt(taxableValue)})</td>
              <td class="right commission-text">-${fmt(commissionAmount)}</td>
            </tr>
            <tr class="payable-row">
              <td>Amount Payable to Property</td>
              <td class="right">${fmt(amountPayableToProperty)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div class="footer-title">Thank You For Your Business!</div>
        <div class="footer-text">If you have any questions concerning this invoice, please contact Triplooper Support.</div>
        <div class="footer-small">This is a computer-generated document and does not require a physical signature.</div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Opens the invoice in a new browser window and triggers print dialog.
 * The user can then print or save as PDF from the browser's print dialog.
 */
export function printInvoice(data: InvoiceData): void {
    const html = buildInvoiceHTML(data);
    const printWindow = window.open('', '_blank', 'width=850,height=700');
    if (!printWindow) {
        alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
}
