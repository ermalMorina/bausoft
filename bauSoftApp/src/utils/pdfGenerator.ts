import { Invoice } from '../types/invoice';

/**
 * Generate HTML content for invoice PDF
 */
export function generateInvoiceHTML(invoice: Invoice): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const statusColors: Record<Invoice['status'], string> = {
    draft: '#999',
    sent: '#007AFF',
    paid: '#34C759',
    overdue: '#FF3B30',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .header {
      margin-bottom: 40px;
    }
    .invoice-number {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background-color: ${statusColors[invoice.status]}20;
      color: ${statusColors[invoice.status]};
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #333;
    }
    .info-block {
      margin-bottom: 20px;
    }
    .info-label {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .info-value {
      color: #666;
      line-height: 1.6;
    }
    .line-items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .line-items th {
      background-color: #f5f5f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }
    .line-items td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    .line-items tr:last-child td {
      border-bottom: none;
    }
    .totals {
      margin-top: 20px;
      text-align: right;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }
    .total-label {
      width: 150px;
      text-align: right;
      padding-right: 20px;
    }
    .total-value {
      width: 100px;
      text-align: right;
      font-weight: 500;
    }
    .grand-total {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid #333;
    }
    .grand-total .total-label,
    .grand-total .total-value {
      font-size: 18px;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-number">${invoice.invoiceNumber}</div>
    <span class="status">${invoice.status.toUpperCase()}</span>
  </div>

  <div style="display: flex; justify-content: space-between;">
    <div class="section" style="flex: 1;">
      <div class="section-title">From</div>
      <div class="info-block">
        <div class="info-label">${invoice.businessInfo.companyName}</div>
        <div class="info-value">${invoice.businessInfo.address.replace(/\n/g, '<br>')}</div>
        ${invoice.businessInfo.vatNumber ? `<div class="info-value">VAT: ${invoice.businessInfo.vatNumber}</div>` : ''}
      </div>
    </div>

    <div class="section" style="flex: 1;">
      <div class="section-title">To</div>
      <div class="info-block">
        <div class="info-label">${invoice.clientInfo.name}</div>
        <div class="info-value">${invoice.clientInfo.address.replace(/\n/g, '<br>')}</div>
        ${invoice.clientInfo.email ? `<div class="info-value">${invoice.clientInfo.email}</div>` : ''}
        ${invoice.clientInfo.phone ? `<div class="info-value">${invoice.clientInfo.phone}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div style="display: flex; gap: 40px;">
      <div>
        <div class="info-label">Issue Date</div>
        <div class="info-value">${formatDate(invoice.issueDate)}</div>
      </div>
      <div>
        <div class="info-label">Due Date</div>
        <div class="info-value">${formatDate(invoice.dueDate)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Items</div>
    <table class="line-items">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Tax %</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems
          .map(
            (item) => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align: right;">${item.quantity}</td>
            <td style="text-align: right;">€${item.unitPrice.toFixed(2)}</td>
            <td style="text-align: right;">${item.taxPercent}%</td>
            <td style="text-align: right;">€${item.total.toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="total-row">
      <div class="total-label">Subtotal:</div>
      <div class="total-value">€${invoice.subtotal.toFixed(2)}</div>
    </div>
    <div class="total-row">
      <div class="total-label">Tax:</div>
      <div class="total-value">€${invoice.taxTotal.toFixed(2)}</div>
    </div>
    ${invoice.discount && invoice.discount > 0
      ? `
    <div class="total-row">
      <div class="total-label">Discount:</div>
      <div class="total-value">-€${invoice.discount.toFixed(2)}</div>
    </div>
    `
      : ''}
    <div class="total-row grand-total">
      <div class="total-label">Total:</div>
      <div class="total-value">€${invoice.grandTotal.toFixed(2)}</div>
    </div>
  </div>

  ${invoice.paymentInfo.paidAmount > 0
    ? `
  <div class="section">
    <div class="section-title">Payment Information</div>
    <div style="display: flex; gap: 40px;">
      <div>
        <div class="info-label">Paid Amount</div>
        <div class="info-value">€${invoice.paymentInfo.paidAmount.toFixed(2)}</div>
      </div>
      ${invoice.paymentInfo.remainingBalance > 0
        ? `
      <div>
        <div class="info-label">Remaining Balance</div>
        <div class="info-value" style="color: #FF3B30; font-weight: 600;">€${invoice.paymentInfo.remainingBalance.toFixed(2)}</div>
      </div>
      `
        : ''}
      ${invoice.paymentInfo.paymentDate
        ? `
      <div>
        <div class="info-label">Payment Date</div>
        <div class="info-value">${formatDate(invoice.paymentInfo.paymentDate)}</div>
      </div>
      `
        : ''}
    </div>
  </div>
  `
    : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>Generated on ${formatDate(new Date().toISOString())}</p>
  </div>
</body>
</html>
  `;
}
