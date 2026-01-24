import { Invoice } from '../types/invoice';

// Optional import - handle missing dependency gracefully
let MailComposer: any;
try {
  MailComposer = require('expo-mail-composer');
} catch (e) {
  console.log('expo-mail-composer not available');
}

/**
 * Send invoice via email
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  pdfUri?: string
): Promise<boolean> {
  if (!MailComposer) {
    throw new Error('expo-mail-composer is not installed. Please install it: npm install expo-mail-composer');
  }

  try {
    const isAvailable = await MailComposer.isAvailableAsync();

    if (!isAvailable) {
      throw new Error('Email service is not available on this device');
    }

    const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.businessInfo.companyName}`;
    const body = `
Dear ${invoice.clientInfo.name},

Please find attached invoice ${invoice.invoiceNumber} for your records.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}
- Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
- Total Amount: €${invoice.grandTotal.toFixed(2)}

${invoice.paymentInfo.remainingBalance > 0
  ? `\nOutstanding Balance: €${invoice.paymentInfo.remainingBalance.toFixed(2)}`
  : '\nThis invoice has been fully paid. Thank you!'}

If you have any questions, please don't hesitate to contact us.

Best regards,
${invoice.businessInfo.companyName}
    `.trim();

    const options: MailComposer.MailComposerOptions = {
      recipients: invoice.clientInfo.email ? [invoice.clientInfo.email] : [],
      subject,
      body,
      isHTML: false,
    };

    if (pdfUri) {
      options.attachments = [pdfUri];
    }

    const result = await MailComposer.composeAsync(options);
    // MailComposerStatus can be SENT, SAVED, or CANCELLED
    return result.status === MailComposer.MailComposerStatus.SENT;
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw new Error(error.message || 'Failed to send email');
  }
}
