const supabaseService = require('../supabaseService');

class ApplicationService {
    // Submit a new application
    async submitApplication(applicationData) {
        try {
            const { data, error } = await supabaseService.client
                .from('community_applications')
                .insert(applicationData)
                .select('*')
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error submitting application:', error);
            return { success: false, error: error.message };
        }
    }

    // Get applications for a community
    async getApplications(communityId, status = null) {
        try {
            let query = supabaseService.client
                .from('community_applications')
                .select('*')
                .eq('community_id', communityId)
                .order('applied_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching applications:', error);
            return { success: false, error: error.message };
        }
    }

    // Get single application
    async getApplication(applicationId) {
        try {
            const { data, error } = await supabaseService.client
                .from('community_applications')
                .select('*')
                .eq('id', applicationId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching application:', error);
            return { success: false, error: error.message };
        }
    }

    // Approve application (simplified)
    async approveApplication(applicationId, reviewedBy) {
        try {
            console.log('🔄 Approving application:', applicationId);

            // Update application status only
            const { data, error } = await supabaseService.client
                .from('community_applications')
                .update({
                    status: 'approved',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: reviewedBy || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', applicationId)
                .select('*')
                .single();

            if (error) throw error;

            if (!data) {
                return { success: false, error: 'Application not found' };
            }

            console.log('✅ Application approved successfully:', applicationId);
            return {
                success: true,
                message: 'Application approved successfully',
                data
            };
        } catch (error) {
            console.error('Error approving application:', error);
            return { success: false, error: error.message };
        }
    }

    // Reject application (simplified)
    async rejectApplication(applicationId, reviewedBy) {
        try {
            console.log('🔄 Rejecting application:', applicationId);

            const { data, error } = await supabaseService.client
                .from('community_applications')
                .update({
                    status: 'rejected',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: reviewedBy || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', applicationId)
                .select('*')
                .single();

            if (error) throw error;

            if (!data) {
                return { success: false, error: 'Application not found' };
            }

            console.log('✅ Application rejected successfully:', applicationId);
            return {
                success: true,
                message: 'Application rejected successfully',
                data
            };
        } catch (error) {
            console.error('Error rejecting application:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user already applied to community
    async checkExistingApplication(communityId, userId) {
        try {
            if (!userId) return { success: true, data: null };

            const { data, error } = await supabaseService.client
                .from('community_applications')
                .select('id, status')
                .eq('community_id', communityId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error checking existing application:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ApplicationService();