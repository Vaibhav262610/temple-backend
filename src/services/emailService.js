// Email Service using Nodemailer
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Check if we're in simulation mode
        if (process.env.EMAIL_MODE === 'simulation') {
            console.log('📧 Email service running in SIMULATION mode');
            console.log('📧 Emails will be logged to console and saved to files');
            this.transporter = null; // No real transporter needed
            return;
        }

        // Configure email transporter for real sending
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'your-email@gmail.com',
                pass: process.env.EMAIL_PASSWORD || 'your-app-password'
            }
        });

        console.log('📧 Email service configured for real sending via Gmail');
    }

    async sendEmail({ from, to, subject, html, text }) {
        try {
            console.log('📧 Sending email via Nodemailer...');
            console.log('📧 From:', from);
            console.log('📧 To:', Array.isArray(to) ? to.join(', ') : to);
            console.log('📧 Subject:', subject);

            const mailOptions = {
                from: from || process.env.EMAIL_USER || 'Temple Admin <noreply@temple.com>',
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: html,
                text: text || this.htmlToText(html)
            };

            const result = await this.transporter.sendMail(mailOptions);

            console.log('✅ Email sent successfully!');
            console.log('📧 Message ID:', result.messageId);

            return {
                success: true,
                messageId: result.messageId,
                recipients: Array.isArray(to) ? to.length : 1,
                status: 'sent'
            };

        } catch (error) {
            console.error('❌ Email sending failed:', error);

            return {
                success: false,
                error: error.message,
                status: 'failed'
            };
        }
    }

    async sendBulkEmail({ from, recipients, subject, html, text }) {
        try {
            console.log('📧 Sending bulk email via Nodemailer...');
            console.log('📧 Recipients:', recipients.length);

            const results = [];
            const batchSize = 10; // Send in batches to avoid rate limits

            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                console.log(`📧 Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipients.length / batchSize)}`);

                const batchPromises = batch.map(recipient =>
                    this.sendEmail({
                        from,
                        to: recipient,
                        subject,
                        html,
                        text
                    })
                );

                const batchResults = await Promise.allSettled(batchPromises);
                results.push(...batchResults);

                // Add delay between batches to avoid rate limiting
                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            console.log(`✅ Bulk email completed: ${successful} sent, ${failed} failed`);

            return {
                success: true,
                total: recipients.length,
                sent: successful,
                failed: failed,
                results: results,
                status: 'sent'
            };

        } catch (error) {
            console.error('❌ Bulk email sending failed:', error);

            return {
                success: false,
                error: error.message,
                status: 'failed'
            };
        }
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connection verified');
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
}

module.exports = new EmailService();