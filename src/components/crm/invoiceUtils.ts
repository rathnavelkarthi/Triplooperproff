import { InvoiceData } from './InvoicePrintTemplate';
import { formatINR } from '../../lib/booking';

/**
 * Generates a self-contained HTML string for an invoice.
 * Used to open in a new window for printing/saving as PDF.
 */
function buildInvoiceHTML(data: InvoiceData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Georgia, 'Times New Roman', serif;
          color: #1f2937;
          background: #fff;
          padding: 40px 50px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 30px; margin-bottom: 30px; }
        .hotel-name { font-size: 26px; font-weight: 700; color: #0c4a6e; margin-bottom: 6px; }
        .hotel-detail { font-size: 13px; color: #6b7280; line-height: 1.6; }
        .inv-title { font-size: 22px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; text-align: right; }
        .inv-meta { font-size: 13px; color: #4b5563; text-align: right; line-height: 1.6; }
        .inv-meta span { font-weight: 400; }
        .section-label { font-size: 10px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
        .guest-name { font-size: 18px; font-weight: 700; color: #1f2937; }
        .guest-detail { font-size: 13px; color: #4b5563; margin-top: 3px; }
        .bill-to { margin-bottom: 35px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
        thead tr { border-bottom: 2px solid #1f2937; }
        th { padding: 10px 0; font-size: 13px; font-weight: 700; text-align: left; }
        th.right { text-align: right; }
        th.center { text-align: center; }
        td { padding: 14px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
        td.right { text-align: right; }
        td.center { text-align: center; }
        .item-desc { font-weight: 600; }
        .item-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 50px; }
        .totals-box { width: 250px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #4b5563; }
        .total-row.border { border-bottom: 1px solid #e5e7eb; }
        .total-row.grand { padding: 12px 0; font-size: 17px; font-weight: 700; color: #111827; border-bottom: 2px solid #1f2937; }
        .total-row.small { font-size: 11px; color: #9ca3af; padding: 4px 0; }
        .status-paid { color: #15803d; font-weight: 600; }
        .status-unpaid { color: #a16207; font-weight: 600; }
        .footer { text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; }
        .footer-title { font-size: 17px; font-weight: 700; color: #0c4a6e; margin-bottom: 5px; }
        .footer-text { font-size: 11px; color: #6b7280; }
        .footer-small { font-size: 10px; color: #9ca3af; margin-top: 15px; }
        @media print {
          body { padding: 20px 30px; }
          @page { margin: 15mm; }
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
          <div class="inv-title">INVOICE</div>
          <div class="inv-meta">Inv. No: <span>${data.invoiceNumber}</span></div>
          <div class="inv-meta">Date: <span>${data.date}</span></div>
          <div class="inv-meta">Booking: <span>${data.bookingId}</span></div>
        </div>
      </div>

      <div class="bill-to">
        <div class="section-label">Bill To</div>
        <div class="guest-name">${data.guestName}</div>
        ${data.guestLocation ? `<div class="guest-detail">${data.guestLocation}</div>` : ''}
        ${data.guestPhone ? `<div class="guest-detail">${data.guestPhone}</div>` : ''}
        ${data.guestEmail ? `<div class="guest-detail">${data.guestEmail}</div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:50%">Description</th>
            <th class="center">Nights</th>
            <th class="right">Rate/Night</th>
            <th class="right" style="width:25%">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-desc">${data.room}</div>
              <div class="item-sub">${data.checkIn} to ${data.checkOut}</div>
            </td>
            <td class="center">${data.nights}</td>
            <td class="right">${formatINR(data.ratePerNight)}</td>
            <td class="right" style="font-weight:500">${formatINR(data.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatINR(data.subtotal)}</span>
          </div>
          <div class="total-row border">
            <span>GST (12%)</span>
            <span>${formatINR(data.gstAmount)}</span>
          </div>
          <div class="total-row grand">
            <span>Total</span>
            <span>${formatINR(data.totalAmount)}</span>
          </div>
          ${data.paymentMethod ? `
          <div class="total-row small">
            <span>Payment Method</span>
            <span>${data.paymentMethod}</span>
          </div>` : ''}
          ${data.paymentStatus ? `
          <div class="total-row small">
            <span>Status</span>
            <span class="${data.paymentStatus === 'Paid' ? 'status-paid' : 'status-unpaid'}">${data.paymentStatus}</span>
          </div>` : ''}
        </div>
      </div>

      <div class="footer">
        <div class="footer-title">Thank You For Your Stay!</div>
        <div class="footer-text">If you have any questions concerning this invoice, please contact reception.</div>
        <div class="footer-small">This is a computer-generated invoice and does not require a signature.</div>
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
