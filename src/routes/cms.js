// CMS Routes - Simple Link Management
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// =============================================
// BANNER ROUTES (single link)
// =============================================
router.get('/banner', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_banner')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching banner:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/banner', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_banner')
            .insert(req.body)
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Banner created successfully' });
    } catch (error) {
        console.error('Error creating banner:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/banner/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_banner')
            .update(req.body)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Banner updated successfully' });
    } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/banner/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseService.client
            .from('cms_banner')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================
// ABOUT ROUTES (single link)
// =============================================
router.get('/about', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_about')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching about:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/about', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_about')
            .insert(req.body)
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'About created successfully' });
    } catch (error) {
        console.error('Error creating about:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/about/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_about')
            .update(req.body)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'About updated successfully' });
    } catch (error) {
        console.error('Error updating about:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/about/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseService.client
            .from('cms_about')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'About deleted successfully' });
    } catch (error) {
        console.error('Error deleting about:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================
// IMAGES ROUTES (multiple images by name: puja, gallery, broadcast, banner)
// =============================================

// GET images by name
router.get('/images/:name', async (req, res) => {
    try {
        const { name } = req.params;

        let query = supabaseService.client
            .from('cms_images')
            .select('*');

        // If requesting 'banner', get all banner slots (banner-1, banner-2, banner-3, banner-4)
        if (name === 'banner') {
            query = query.or('name.eq.banner-1,name.eq.banner-2,name.eq.banner-3,name.eq.banner-4');
        } else {
            query = query.eq('name', name);
        }

        query = query.order('name', { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        // Sort banner slots in order
        if (name === 'banner' && data) {
            data.sort((a, b) => {
                const aNum = parseInt(a.name.split('-')[1] || '0');
                const bNum = parseInt(b.name.split('-')[1] || '0');
                return aNum - bNum;
            });
        }

        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUBLIC ENDPOINT: Get active banner image for main website
router.get('/public/banner', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_images')
            .select('*')
            .eq('name', 'banner')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            // If no banner found, return empty response
            if (error.code === 'PGRST116') {
                return res.json({ success: true, data: null });
            }
            throw error;
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching public banner:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUBLIC ENDPOINT: Get ALL active banners for carousel
router.get('/public/banners', async (req, res) => {
    try {
        console.log('📸 Fetching all active banners for carousel');

        const { data, error } = await supabaseService.client
            .from('cms_images')
            .select('*')
            .or('name.eq.banner-1,name.eq.banner-2,name.eq.banner-3,name.eq.banner-4')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;

        // Sort by banner number
        if (data) {
            data.sort((a, b) => {
                const aNum = parseInt(a.name.split('-')[1] || '0');
                const bNum = parseInt(b.name.split('-')[1] || '0');
                return aNum - bNum;
            });
        }

        console.log(`✅ Found ${data?.length || 0} active banners`);

        res.json({
            success: true,
            data: data || [],
            count: data?.length || 0
        });
    } catch (error) {
        console.error('❌ Error fetching public banners:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create image
router.post('/images', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_images')
            .insert(req.body)
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Image added successfully' });
    } catch (error) {
        console.error('Error creating image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update image
router.put('/images/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_images')
            .update(req.body)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Image updated successfully' });
    } catch (error) {
        console.error('Error updating image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE image
router.delete('/images/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseService.client
            .from('cms_images')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================
// CONTACT FORM ROUTES
// =============================================

// GET all contact submissions
router.get('/contact', async (req, res) => {
    try {
        const { status, is_read } = req.query;
        let query = supabaseService.client
            .from('cms_contact')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }
        if (is_read !== undefined) {
            query = query.eq('is_read', is_read === 'true');
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching contact submissions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET single contact submission
router.get('/contact/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_contact')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching contact submission:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST create contact submission (public endpoint for website)
router.post('/contact', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('cms_contact')
            .insert(req.body)
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'Contact form submitted successfully' });
    } catch (error) {
        console.error('Error creating contact submission:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT update contact submission (mark as read, add notes, etc.)
router.put('/contact/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_contact')
            .update(req.body)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Contact submission updated successfully' });
    } catch (error) {
        console.error('Error updating contact submission:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE contact submission
router.delete('/contact/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseService.client
            .from('cms_contact')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Contact submission deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact submission:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH mark as read
router.patch('/contact/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_contact')
            .update({ is_read: true, status: 'read' })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        res.json({ success: true, data, message: 'Marked as read' });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;


// =============================================
// ABOUT MANDIR ROUTES
// =============================================
router.get('/about-mandir', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('about_mandir')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching about mandir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/about-mandir', async (req, res) => {
    try {
        const { data, error } = await supabaseService.client
            .from('about_mandir')
            .insert({
                ...req.body,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('*')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data, message: 'About Mandir created successfully' });
    } catch (error) {
        console.error('Error creating about mandir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/about-mandir/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Updating about_mandir:', id, req.body);

        const { data, error } = await supabaseService.client
            .from('about_mandir')
            .update({
                ...req.body,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*');

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'About Mandir record not found'
            });
        }

        console.log('Update successful:', data[0]);
        res.json({ success: true, data: data[0], message: 'About Mandir updated successfully' });
    } catch (error) {
        console.error('Error updating about mandir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/about-mandir/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseService.client
            .from('about_mandir')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'About Mandir deleted successfully' });
    } catch (error) {
        console.error('Error deleting about mandir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
