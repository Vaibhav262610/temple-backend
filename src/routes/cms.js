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
// IMAGES ROUTES (multiple images by name: puja, gallery, broadcast)
// =============================================

// GET images by name
router.get('/images/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { data, error } = await supabaseService.client
            .from('cms_images')
            .select('*')
            .eq('name', name)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Error fetching images:', error);
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
