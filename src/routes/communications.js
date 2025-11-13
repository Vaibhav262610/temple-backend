// Email Communications Routes - Supabase Compatible
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const emailService = require('../services/emailService-simple');
const { body } = require('express-validator');

// =============================================
// EMAIL COMMUNICATIONS ROUTES
// =============================================

// GET all email communications
router.get('/emails', async (req, res) => {
    try {
        const { community_id, status, limit = 50, page = 1 } = req.query;

        console.log('📧 Fetching emails with filters:', { community_id, status, limit, page });

        let query = supabaseService.client
            .from('email_communications')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (community_id && community_id !== 'all') {
            query = query.eq('community_id', community_id);
        }
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            total: data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch emails',
            error: error.message
        });
    }
});

// POST send email
router.post('/emails/send', async (req, res) => {
    try {
        const {
            community_id,
            sender_email,
            recipient_emails,
            subject,
            content,
            template_id,
            scheduled_at
        } = req.body;

        console.log('📧 Sending email:', { subject, recipient_count: recipient_emails?.length });

        // Validate required fields
        if (!sender_email || !recipient_emails || !subject || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: sender_email, recipient_emails, subject, content'
            });
        }

        // Store email record
        const emailData = {
            community_id,
            sender_email,
            recipient_emails: Array.isArray(recipient_emails) ? recipient_emails : [recipient_emails],
            subject,
            content,
            template_id: template_id || null,
            status: scheduled_at ? 'scheduled' : 'sending',
            scheduled_at: scheduled_at || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: emailRecord, error: insertError } = await supabaseService.client
            .from('email_communications')
            .insert(emailData)
            .select('*')
            .single();

        if (insertError) throw insertError;

        // If not scheduled, simulate email sending for now
        if (!scheduled_at) {
            try {
                // Send real email using Nodemailer
                console.log('📧 Sending real email to:', recipient_emails.length, 'recipients');
                console.log('📧 Subject:', subject);
                console.log('📧 From:', sender_email);

                // Send email using real email service
                const emailResult = await emailService.sendEmail({
                    from: `${process.env.EMAIL_FROM_NAME || 'Temple Admin'} <${process.env.EMAIL_USER || sender_email}>`,
                    to: recipient_emails,
                    subject: subject,
                    html: content
                });

                if (!emailResult.success) {
                    throw new Error(emailResult.error);
                }

                // Update status to sent
                await supabaseService.client
                    .from('email_communications')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        delivery_status: emailResult,
                        recipient_count: recipient_emails.length,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', emailRecord.id);

                console.log('✅ Email sent successfully:', emailRecord.id);
                console.log('📧 Message ID:', emailResult.messageId);

                res.status(201).json({
                    success: true,
                    data: {
                        ...emailRecord,
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        recipient_count: recipient_emails.length
                    },
                    message: `Email sent successfully to ${recipient_emails.length} recipients`
                });

            } catch (sendError) {
                console.error('Error in email sending process:', sendError);

                // Update status to failed
                await supabaseService.client
                    .from('email_communications')
                    .update({
                        status: 'failed',
                        delivery_status: { error: sendError.message },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', emailRecord.id);

                res.status(500).json({
                    success: false,
                    message: 'Failed to send email',
                    error: sendError.message
                });
            }
        } else {
            // Email is scheduled
            console.log('📅 Email scheduled for:', scheduled_at);

            res.status(201).json({
                success: true,
                data: emailRecord,
                message: 'Email scheduled successfully'
            });
        }

    } catch (error) {
        console.error('Error processing email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process email',
            error: error.message
        });
    }
});

// POST send bulk email to volunteers
router.post('/emails/send-to-volunteers', async (req, res) => {
    try {
        const {
            community_id,
            sender_email,
            volunteer_filter,
            subject,
            content,
            template_id
        } = req.body;

        console.log('📧 Sending bulk email to volunteers:', { community_id, volunteer_filter });

        // Get volunteers based on filter
        let volunteerQuery = supabaseService.client
            .from('volunteers')
            .select('email, first_name, last_name')
            .eq('status', 'active');

        if (community_id && community_id !== 'all') {
            volunteerQuery = volunteerQuery.eq('community_id', community_id);
        }

        if (volunteer_filter?.skills) {
            volunteerQuery = volunteerQuery.contains('skills', [volunteer_filter.skills]);
        }

        const { data: volunteers, error: volunteerError } = await volunteerQuery;

        if (volunteerError) throw volunteerError;

        if (!volunteers || volunteers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No volunteers found matching the criteria'
            });
        }

        const recipient_emails = volunteers.map(v => v.email);

        // Personalize content if needed
        let personalizedContent = content;

        // Store and send email
        const emailData = {
            community_id,
            sender_email,
            recipient_emails,
            subject,
            content: personalizedContent,
            template_id: template_id || null,
            status: 'sending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: emailRecord, error: insertError } = await supabaseService.client
            .from('email_communications')
            .insert(emailData)
            .select('*')
            .single();

        if (insertError) throw insertError;

        // Simulate bulk email sending
        try {
            console.log('📧 Sending real bulk email to:', recipient_emails.length, 'volunteers');
            console.log('📧 Subject:', subject);
            console.log('📧 From:', sender_email);
            console.log('📧 Recipients:', recipient_emails.slice(0, 3).join(', '), recipient_emails.length > 3 ? '...' : '');

            // Send bulk email using real email service
            const bulkEmailResult = await emailService.sendBulkEmail({
                from: `${process.env.EMAIL_FROM_NAME || 'Temple Admin'} <${process.env.EMAIL_USER || sender_email}>`,
                recipients: recipient_emails,
                subject: subject,
                html: personalizedContent
            });

            if (!bulkEmailResult.success) {
                throw new Error(bulkEmailResult.error);
            }

            const emailResult = {
                messageId: `bulk_${Date.now()}`,
                recipients: recipient_emails.length,
                status: 'sent',
                sent: bulkEmailResult.sent,
                failed: bulkEmailResult.failed,
                volunteers: volunteers.map(v => ({
                    email: v.email,
                    name: `${v.first_name} ${v.last_name}`
                }))
            };

            // Update status to sent
            await supabaseService.client
                .from('email_communications')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    delivery_status: emailResult,
                    recipient_count: recipient_emails.length,
                    updated_at: new Date().toISOString()
                })
                .eq('id', emailRecord.id);

            console.log('✅ Bulk email sent successfully to', bulkEmailResult.sent, 'volunteers');
            console.log('❌ Failed to send to', bulkEmailResult.failed, 'volunteers');

            res.status(201).json({
                success: true,
                data: {
                    ...emailRecord,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    recipient_count: recipient_emails.length
                },
                message: `Bulk email sent successfully to ${recipient_emails.length} volunteers`
            });

        } catch (sendError) {
            console.error('Error in bulk email sending process:', sendError);

            await supabaseService.client
                .from('email_communications')
                .update({
                    status: 'failed',
                    delivery_status: { error: sendError.message },
                    updated_at: new Date().toISOString()
                })
                .eq('id', emailRecord.id);

            res.status(500).json({
                success: false,
                message: 'Failed to send bulk email',
                error: sendError.message
            });
        }

    } catch (error) {
        console.error('Error processing bulk email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process bulk email',
            error: error.message
        });
    }
});

// =============================================
// EMAIL TEMPLATES ROUTES
// =============================================

// GET all email templates
router.get('/templates', async (req, res) => {
    try {
        const { community_id, category, is_active, limit = 50, page = 1 } = req.query;

        console.log('📄 Fetching email templates with filters:', { community_id, category, is_active });

        let query = supabaseService.client
            .from('email_templates')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (community_id && community_id !== 'all') {
            query = query.eq('community_id', community_id);
        }
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            total: data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch email templates',
            error: error.message
        });
    }
});

// POST create email template
router.post('/templates', async (req, res) => {
    try {
        const templateData = {
            ...req.body,
            is_active: true,
            usage_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('email_templates')
            .insert(templateData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('✅ Email template created:', data.id);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Email template created successfully'
        });

    } catch (error) {
        console.error('Error creating email template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create email template',
            error: error.message
        });
    }
});

// PUT update email template
router.put('/templates/:id', async (req, res) => {
    try {
        const templateId = req.params.id;
        const updateData = {
            ...req.body,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('email_templates')
            .update(updateData)
            .eq('id', templateId)
            .select('*')
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Email template not found'
            });
        }

        console.log('✅ Email template updated:', data.id);

        res.json({
            success: true,
            data: data,
            message: 'Email template updated successfully'
        });

    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update email template',
            error: error.message
        });
    }
});

// GET template by ID
router.get('/templates/:id', async (req, res) => {
    try {
        const templateId = req.params.id;

        const { data, error } = await supabaseService.client
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Email template not found'
            });
        }

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Error fetching email template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch email template',
            error: error.message
        });
    }
});

module.exports = router;