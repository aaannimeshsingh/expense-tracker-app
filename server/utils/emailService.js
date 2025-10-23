const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Emails will be simulated.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail', // or use custom SMTP
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate HTML email template
const generateExpenseReportHTML = (data) => {
  const {
    reportType,
    period,
    totalExpenses,
    transactionCount,
    categoryBreakdown,
    totalBudget,
    budgetRemaining,
    topExpenses,
    userName
  } = data;

  let categoryRows = '';
  Object.entries(categoryBreakdown).forEach(([cat, amount]) => {
    const percentage = ((amount / totalExpenses) * 100).toFixed(1);
    categoryRows += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${cat}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${amount.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">${percentage}%</td>
      </tr>
    `;
  });

  let topExpensesRows = '';
  if (topExpenses && topExpenses.length > 0) {
    topExpenses.slice(0, 5).forEach(exp => {
      topExpensesRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${new Date(exp.date).toLocaleDateString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${exp.description}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${exp.category}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600;">$${exp.amount.toFixed(2)}</td>
        </tr>
      `;
    });
  }

  const budgetStatus = totalBudget > 0 ? (budgetRemaining >= 0 ? 'On Track' : 'Over Budget') : 'No Budget Set';
  const budgetColor = totalBudget > 0 ? (budgetRemaining >= 0 ? '#10b981' : '#ef4444') : '#6b7280';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Expense Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💰 Expense Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <!-- Greeting -->
          <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
            Hello <strong>${userName || 'User'}</strong>,
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
            Here's your expense summary for the period: <strong>${period}</strong>
          </p>

          <!-- Summary Cards -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%); padding: 20px; border-radius: 12px;">
              <p style="margin: 0; font-size: 12px; color: #78350f; font-weight: 600; text-transform: uppercase;">Total Spent</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #78350f;">$${totalExpenses.toFixed(2)}</p>
            </div>
            <div style="background: linear-gradient(135deg, #dbeafe 0%, #3b82f6 100%); padding: 20px; border-radius: 12px;">
              <p style="margin: 0; font-size: 12px; color: #1e3a8a; font-weight: 600; text-transform: uppercase;">Transactions</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #1e3a8a;">${transactionCount}</p>
            </div>
          </div>

          ${totalBudget > 0 ? `
          <!-- Budget Status -->
          <div style="background: ${budgetRemaining >= 0 ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${budgetColor}; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937;">Budget Status: <span style="color: ${budgetColor};">${budgetStatus}</span></h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 14px; color: #6b7280;">Budget Limit:</span>
              <span style="font-size: 14px; font-weight: 600; color: #1f2937;">$${totalBudget.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 14px; color: #6b7280;">Remaining:</span>
              <span style="font-size: 14px; font-weight: 600; color: ${budgetColor};">$${Math.abs(budgetRemaining).toFixed(2)} ${budgetRemaining < 0 ? 'over' : 'left'}</span>
            </div>
          </div>
          ` : ''}

          <!-- Spending by Category -->
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; font-weight: 700;">📊 Spending by Category</h3>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Category</th>
                <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Amount</th>
                <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase;">%</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>

          ${topExpensesRows ? `
          <!-- Top Expenses -->
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937; font-weight: 700;">🔝 Top Expenses</h3>
          <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Date</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Description</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Category</th>
                <th style="padding: 10px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${topExpensesRows}
            </tbody>
          </table>
          ` : ''}

          <!-- Tip Box -->
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
              <strong>💡 Financial Tip:</strong> Review your spending regularly to stay on track with your budget. Consider setting category-specific limits for better control!
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Generated by <strong>Tracker AI</strong> Expense Manager</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send expense report email
const sendExpenseReport = async (recipientEmail, reportData) => {
  const transporter = createTransporter();

  // If no transporter (credentials not configured), simulate email
  if (!transporter) {
    console.log('📧 Email would be sent to:', recipientEmail);
    console.log('📊 Report data:', {
      period: reportData.period,
      total: reportData.totalExpenses,
      transactions: reportData.transactionCount
    });
    
    return {
      success: true,
      simulated: true,
      message: 'Email simulation successful (configure EMAIL_USER and EMAIL_PASS in .env to send real emails)'
    };
  }

  // Send real email
  try {
    const htmlContent = generateExpenseReportHTML(reportData);

    await transporter.sendMail({
      from: `"Tracker AI" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: reportData.subject || 'Your Expense Report',
      html: htmlContent,
    });

    return {
      success: true,
      simulated: false,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

module.exports = {
  sendExpenseReport
};