const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Send acceptance email with login credentials.
 * Non-fatal — logs errors but does not throw.
 */
async function sendAcceptanceEmail(toEmail, fullName, tempPassword) {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: '🎉 Registration Accepted — Your Music Exam Platform Credentials',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700;">🎵 Music Exam Platform</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color:#1a1a2e; margin:0 0 16px; font-size:22px;">Congratulations, ${fullName}! 🎉</h2>
              <p style="color:#4a4a68; font-size:15px; line-height:1.6; margin:0 0 24px;">
                Your registration has been <strong style="color:#22c55e;">accepted</strong>. Your student account has been created and you can now log in to the platform.
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff; border: 1px solid #e8e6f0; border-radius:8px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="color:#764ba2; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 16px;">Your Login Credentials</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color:#6b7280; font-size:14px; width:100px;">Email:</td>
                        <td style="padding: 8px 0; color:#1a1a2e; font-size:14px; font-weight:600;">${toEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color:#6b7280; font-size:14px; width:100px;">Password:</td>
                        <td style="padding: 8px 0;">
                          <code style="background:#e8e6f0; padding: 4px 12px; border-radius:4px; font-size:14px; font-weight:700; color:#764ba2; letter-spacing:0.5px;">${tempPassword}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#ef4444; font-size:13px; line-height:1.5; margin:0 0 24px; padding:12px; background:#fef2f2; border-radius:6px;">
                ⚠️ <strong>Important:</strong> Please change your password after your first login for security purposes.
              </p>

              <p style="color:#4a4a68; font-size:15px; line-height:1.6; margin:0;">
                We look forward to seeing you on the platform. Best of luck with your exams!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f7ff; padding: 20px 40px; text-align:center; border-top: 1px solid #e8e6f0;">
              <p style="color:#9ca3af; font-size:12px; margin:0;">
                This is an automated email from Music Exam Platform. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `
        });

        if (error) {
            console.error('Resend acceptance email error:', error);
            return { success: false, error };
        }

        console.log('Acceptance email sent to', toEmail, '| Resend ID:', data?.id);
        return { success: true, id: data?.id };
    } catch (err) {
        console.error('Failed to send acceptance email:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send rejection email with reason.
 * Non-fatal — logs errors but does not throw.
 */
async function sendRejectionEmail(toEmail, fullName, reason) {
    try {
        const reasonBlock = reason
            ? `<p style="color:#1a1a2e; font-size:14px; line-height:1.6; margin:0; padding:16px; background:#fef2f2; border-left:4px solid #ef4444; border-radius:4px;">${reason}</p>`
            : `<p style="color:#6b7280; font-size:14px; font-style:italic; margin:0;">No specific reason was provided.</p>`;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: 'Registration Update — Music Exam Platform',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700;">🎵 Music Exam Platform</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color:#1a1a2e; margin:0 0 16px; font-size:22px;">Dear ${fullName},</h2>
              <p style="color:#4a4a68; font-size:15px; line-height:1.6; margin:0 0 24px;">
                Thank you for your interest in the Music Exam Platform. After careful review, we regret to inform you that your registration has <strong style="color:#ef4444;">not been approved</strong> at this time.
              </p>

              <!-- Reason -->
              <div style="margin: 0 0 24px;">
                <p style="color:#764ba2; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 12px;">Reason</p>
                ${reasonBlock}
              </div>

              <p style="color:#4a4a68; font-size:15px; line-height:1.6; margin:0 0 8px;">
                If you believe this is an error or have questions, please feel free to reach out to the administration.
              </p>
              <p style="color:#4a4a68; font-size:15px; line-height:1.6; margin:0;">
                You are welcome to re-apply in the future.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f7ff; padding: 20px 40px; text-align:center; border-top: 1px solid #e8e6f0;">
              <p style="color:#9ca3af; font-size:12px; margin:0;">
                This is an automated email from Music Exam Platform. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `
        });

        if (error) {
            console.error('Resend rejection email error:', error);
            return { success: false, error };
        }

        console.log('Rejection email sent to', toEmail, '| Resend ID:', data?.id);
        return { success: true, id: data?.id };
    } catch (err) {
        console.error('Failed to send rejection email:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendAcceptanceEmail, sendRejectionEmail };
