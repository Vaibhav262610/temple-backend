// Simple Email Service - Logs emails to console and files
const fs = require('fs');
const path = require('path');

class SimpleEmailService {
    constructor() {
        console.log('📧 Simple Email Service initialized');
        console.log('📧 Mode: Simulation (logs to console and saves to files)');
        this.ensureEmailsDirectory();
    }

    ensureEmailsDirectory() {
        const emailsDir = path.join(__dirname, '../../emails');
        if (!fs.existsSync(emailsDir)) {
            fs.mkdirSync(emailsDir, { recursive: true });
            console.log('📁 Created emails directory:', emailsDir);
        }
    }

    async sendEmail({ from, to, subject, html, text }) {
        try {
            const recipients = Array.isArray(to) ? to : [to];
            const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            console.log('\n🎭 ===== EMAIL SIMULATION =====');
            console.log('📧 From:', from);
            console.log('📧 To:', recipients.join(', '));
            console.log('📧 Subject:', subject);
            console.log('📧 Message ID:', messageId);
            console.log('📧 Recipients Count:', recipients.length);

            // Log the email content
            console.log('\n📄 EMAIL CONTENT:');
            console.log('================');
            console.log(this.htmlToText(html));
            console.log('================\n');

            // Save email to files
            const timestamp = Date.now();
            const emailData = {
                timestamp: new Date().toISOString(),
                from: from,
                to: recipients,
                subject: subject,
                html: html,
                text: text || this.htmlToText(html),
                messageId: messageId
            };

            // Save as JSON
            const jsonFilename = `email_${timestamp}.json`;
            const jsonFilepath = path.join(__dirname, '../../emails', jsonFilename);
            fs.writeFileSync(jsonFilepath, JSON.stringify(emailData, null, 2));

            // Save as HTML for viewing in browser
            const htmlFilename = `email_${timestamp}.html`;
            const htmlFilepath = path.join(__dirname, '../../emails', htmlFilename);
            const fullHtml = this.createViewableHtml(from, recipients, subject, html);
            fs.writeFileSync(htmlFilepath, fullHtml);

            console.log('💾 Email saved to files:');
            console.log('   📄 JSON:', jsonFilepath);
            console.log('   🌐 HTML:', htmlFilepath);

            // Special message for your email
            if (recipients.includes('vaibhavrajpoot2626@gmail.com')) {
                console.log('\n🎯 ===== MESSAGE FOR VAIBHAV =====');
                console.log('📧 This email would have been sent to: vaibhavrajpoot2626@gmail.com');
                console.log('📧 Subject: ' + subject);
                console.log('📧 You can view the HTML version at: ' + htmlFilepath);
                console.log('📧 Open this file in your browser to see how the email looks!');
                console.log('📧 The email content is shown above in the console.');
                console.log('================================\n');
            }

            return {
                success: true,
                messageId: messageId,
                recipients: recipients.length,
                status: 'sent',
                simulation: true,
                files: {
                    json: jsonFilepath,
                    html: htmlFilepath
                }
            };

        } catch (error) {
            console.error('❌ Email simulation failed:', error);

            return {
                success: false,
                error: error.message,
                status: 'failed'
            };
        }
    }

    async sendBulkEmail({ from, recipients, subject, html, text }) {
        try {
            console.log('\n📧 ===== BULK EMAIL SIMULATION =====');
            console.log('📧 From:', from);
            console.log('📧 Recipients:', recipients.length);
            console.log('📧 Subject:', subject);

            // Log first few recipients
            console.log('📧 Sample recipients:', recipients.slice(0, 5).join(', '));
            if (recipients.length > 5) {
                console.log('📧 ... and', recipients.length - 5, 'more');
            }

            const results = [];
            const messageId = `bulk_sim_${Date.now()}`;

            // Simulate sending to each recipient
            for (let i = 0; i < recipients.length; i++) {
                const recipient = recipients[i];
                console.log(`📧 [${i + 1}/${recipients.length}] Simulating send to: ${recipient}`);

                const result = await this.sendEmail({
                    from,
                    to: recipient,
                    subject,
                    html,
                    text
                });

                results.push(result);
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            console.log('\n✅ BULK EMAIL SIMULATION COMPLETE');
            console.log('📊 Total:', recipients.length);
            console.log('📊 Successful:', successful);
            console.log('📊 Failed:', failed);

            // Check if your email was included
            if (recipients.includes('vaibhavrajpoot2626@gmail.com')) {
                console.log('\n🎯 YOUR EMAIL WAS INCLUDED!');
                console.log('📧 vaibhavrajpoot2626@gmail.com would have received this email');
                console.log('📧 Check the individual email files created above');
            }

            return {
                success: true,
                total: recipients.length,
                sent: successful,
                failed: failed,
                results: results,
                status: 'sent',
                messageId: messageId
            };

        } catch (error) {
            console.error('❌ Bulk email simulation failed:', error);

            return {
                success: false,
                error: error.message,
                status: 'failed'
            };
        }
    }

    htmlToText(html) {
        if (!html) return '';

        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    createViewableHtml(from, recipients, subject, content) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .email-wrapper { background: white; max-width: 800px; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
        .email-header { background: #d97706; color: white; padding: 20px; }
        .email-meta { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #eee; font-size: 14px; color: #666; }
        .email-content { padding: 20px; }
        .simulation-notice { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-header">
            <h1 style="margin: 0; font-size: 24px;">📧 Email Simulation</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Temple Management System</p>
        </div>
        
        <div class="email-meta">
            <p style="margin: 5px 0;"><strong>From:</strong> ${from}</p>
            <p style="margin: 5px 0;"><strong>To:</strong> ${recipients.join(', ')}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="email-content">
            <div class="simulation-notice">
                <strong>📧 Email Simulation</strong><br>
                This is how your email would look when sent to recipients. 
                In a real setup with Gmail credentials, this would be delivered to actual inboxes.
            </div>
            
            ${content}
        </div>
    </div>
</body>
</html>`;
    }

    async testConnection() {
        console.log('✅ Simple email service connection verified (simulation mode)');
        return true;
    }
}

module.exports = new SimpleEmailService();