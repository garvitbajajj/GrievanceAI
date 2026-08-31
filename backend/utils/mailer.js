import nodemailer from 'nodemailer';

/**
 * Gmail SMTP Transport
 * Uses App Password (NOT your actual Gmail password).
 * Generate at: Google Account → Security → 2FA → App Passwords → Mail
 */
const MAIL_ENABLED = !!(process.env.GMAIL_USER && process.env.GMAIL_PASS);

if (!MAIL_ENABLED) {
  console.warn('⚠️  [Mailer] GMAIL_USER or GMAIL_PASS not set — email notifications disabled.');
}

const transporter = MAIL_ENABLED
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    })
  : null;

// Helper — safely send mail or skip gracefully
async function _send(options) {
  if (!MAIL_ENABLED || !transporter) {
    console.warn(`⚠️  [Mailer] Email skipped (not configured): to=${options.to}, subject="${options.subject}"`);
    return { messageId: 'skipped' };
  }
  return transporter.sendMail(options);
}

/**
 * Send follow-up email to citizen asking if their grievance is resolved.
 * @param {string} to       — Citizen's email address
 * @param {string} grievanceId — MongoDB ObjectId of the grievance
 * @param {string} category — Grievance category (e.g. 'water')
 * @param {string} title    — Short title of the grievance
 */
export async function sendFollowUpEmail(to, grievanceId, category, title) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resolvedLink = `${frontendBase}/grievance/${grievanceId}?feedback=resolved`;
  const pendingLink = `${frontendBase}/grievance/${grievanceId}?feedback=pending`;

  const mailOptions = {
    from: `"BhashaFlow" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Is your grievance resolved? — BhashaFlow #GRV-${grievanceId}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">🇮🇳 BhashaFlow</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0;">Multilingual Citizen Grievance Portal</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 25px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">Follow-Up on Your Grievance</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Namaste! We are following up on your grievance submitted to BhashaFlow.
          </p>
          
          <div style="background: #fff; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333;"><strong>Category:</strong> ${category}</p>
            <p style="margin: 5px 0 0; color: #333;"><strong>Title:</strong> ${title}</p>
            <p style="margin: 5px 0 0; color: #888;"><strong>Reference:</strong> GRV-${grievanceId}</p>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            Has your issue been resolved? Please let us know:
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resolvedLink}" 
               style="background: #4CAF50; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block; font-weight: bold;">
              ✅ Yes, Resolved
            </a>
            <a href="${pendingLink}" 
               style="background: #FF9800; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block; font-weight: bold;">
              ❌ No, Still Pending
            </a>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            If you did not submit this grievance, please ignore this email.
          </p>
        </div>
        
        <div style="background: #333; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="color: #aaa; margin: 0; font-size: 12px;">
            BhashaFlow — NIIT University Capstone Project 2024
          </p>
        </div>
      </div>
    `
  };

  const info = await _send(mailOptions);
  console.log(`📧 Follow-up email sent to ${to} — MessageID: ${info.messageId}`);
  return info;
}

/**
 * Send resolution notification email to citizen when admin resolves their grievance.
 * Includes the admin's response (optionally translated) and Yes/No feedback buttons.
 *
 * @param {string} to              — Citizen's email
 * @param {string} grievanceId     — MongoDB ObjectId
 * @param {string} category        — Grievance category
 * @param {string} title           — Grievance title
 * @param {string} adminRemark     — Admin's response text
 * @param {string} translatedRemark— Admin's response in citizen's language (may equal adminRemark if translation failed)
 * @param {string} lang            — Detected language code (e.g. 'hi', 'ta')
 */
export async function sendResolutionEmail(to, grievanceId, category, title, adminRemark, translatedRemark, lang) {
  const frontendBase   = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resolvedLink   = `${frontendBase}/grievance/${grievanceId}?feedback=resolved`;
  const pendingLink    = `${frontendBase}/grievance/${grievanceId}?feedback=not_resolved`;
  const isNative       = translatedRemark && translatedRemark !== adminRemark;

  const mailOptions = {
    from: `"BhashaFlow" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your Grievance Has Been Resolved — BhashaFlow #GRV-${String(grievanceId).slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <p style="font-size: 28px; margin: 0;">☸</p>
          <h1 style="color: #fff; margin: 8px 0 4px; font-size: 20px; letter-spacing: -0.5px;">BhashaFlow</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 13px;">Student Initiative — Multilingual Citizen Grievance Portal</p>
        </div>

        <!-- Body -->
        <div style="background: #f8f9ff; padding: 28px; border: 1px solid #e0e4f5; border-top: none;">
          <h2 style="color: #1a237e; margin-top: 0; font-size: 18px;">✅ Your Grievance Has Been Addressed</h2>

          <!-- Reference -->
          <div style="background: #fff; border-left: 4px solid #3949ab; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px; color: #444;"><strong>Reference:</strong> GRV-${String(grievanceId).slice(-8).toUpperCase()}</p>
            <p style="margin: 0 0 4px; color: #444;"><strong>Category:</strong> ${category || 'General'}</p>
            <p style="margin: 0; color: #888; font-size: 13px;">${title || ''}</p>
          </div>

          <!-- Admin Response -->
          <h3 style="color: #333; font-size: 15px; margin-bottom: 10px;">Official Response from the Authority:</h3>
          ${isNative ? `
          <div style="background: #fffde7; border: 1px solid #f9a825; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
            <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.7;">${translatedRemark}</p>
          </div>
          <p style="color: #888; font-size: 12px; margin: 0 0 16px;">(English: ${adminRemark})</p>
          ` : `
          <div style="background: #fffde7; border: 1px solid #f9a825; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.7;">${adminRemark}</p>
          </div>
          `}

          <!-- Feedback question -->
          <p style="color: #555; font-size: 14px; line-height: 1.7; margin-bottom: 8px;">
            <strong>Has your issue actually been resolved?</strong> Please let us know so we can close this grievance or escalate it further.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${resolvedLink}"
               style="background: #2e7d32; color: #fff; padding: 13px 32px; text-decoration: none; border-radius: 8px; margin: 0 8px; display: inline-block; font-weight: bold; font-size: 14px;">
              ✅ Yes, Resolved
            </a>
            <a href="${pendingLink}"
               style="background: #c62828; color: #fff; padding: 13px 32px; text-decoration: none; border-radius: 8px; margin: 0 8px; display: inline-block; font-weight: bold; font-size: 14px;">
              ❌ No, Still Pending
            </a>
          </div>

          <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 16px;">
            If you did not submit this grievance, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #1a237e; padding: 14px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: rgba(255,255,255,0.5); margin: 0; font-size: 11px;">
            BhashaFlow — NIIT University Student Capstone Project &nbsp;|&nbsp; Ref: GRV-${String(grievanceId).slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    `
  };

  const info = await _send(mailOptions);
  console.log(`📧 Resolution email sent to ${to} — MessageID: ${info.messageId}`);
  return info;
}

/**
 * Send a password reset email with a unique token link.
 * @param {string} to - Citizen's email address
 * @param {string} token - The reset token
 */
export async function sendPasswordResetEmail(to, token) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${frontendBase}/reset-password/${token}`;

  const mailOptions = {
    from: `"BhashaFlow Support" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Password Reset Request — BhashaFlow`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">🇮🇳 BhashaFlow</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0;">Multilingual Citizen Grievance Portal</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 25px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
          
          <p style="color: #555; line-height: 1.6;">
            We received a request to reset your password for your BhashaFlow account.
          </p>
          
          <p style="color: #555; line-height: 1.6;">
            Click the button below to set a new password. This link is valid for 1 hour.
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" 
               style="background: #4CAF50; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block; font-weight: bold;">
               Reset Password
            </a>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="background: #333; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="color: #aaa; margin: 0; font-size: 12px;">
            BhashaFlow — Secure Identity Management
          </p>
        </div>
      </div>
    `
  };

  const info = await _send(mailOptions);
  console.log(`📧 Password reset email sent to ${to} — MessageID: ${info.messageId}`);
  return info;
}

export { MAIL_ENABLED };
export default transporter;
