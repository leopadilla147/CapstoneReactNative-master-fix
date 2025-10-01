import { supabase } from '../config/supabase';

export const thesisService = {

  async getThesisByFileUrl(fileUrl) {
    try {
      console.log('Looking up thesis by file URL:', fileUrl);
      
      // Extract just the filename if it's a full URL
      let searchUrl = fileUrl;
      if (fileUrl.includes('/')) {
        // Extract the filename from the URL
        const urlParts = fileUrl.split('/');
        searchUrl = urlParts[urlParts.length - 1];
        console.log('Extracted filename:', searchUrl);
      }

      // Search for thesis with this file_url
      const { data, error } = await supabase
        .from('thesestwo')
        .select('*')
        .ilike('file_url', `%${searchUrl}%`) // Use ilike for partial match
        .single();

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          throw new Error('No thesis found for this file URL');
        }
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('Thesis not found for this file');
      }

      console.log('Found thesis:', data.title);
      return data;
    } catch (error) {
      console.error('Error fetching thesis by file URL:', error);
      throw error;
    }
  },

  // Get thesis by ID
  async getThesisById(thesisId) {
    try {
      console.log('Fetching thesis with ID:', thesisId);
      
      const { data, error } = await supabase
        .from('thesestwo')
        .select('*')
        .eq('thesis_id', thesisId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Thesis not found');

      return data;
    } catch (error) {
      console.error('Error fetching thesis:', error);
      throw error;
    }
  },

  // Record scan history
  async recordScan(userId, identifier, type = 'thesis_id') {
    try {
      // For file URLs, we need to get the thesis_id first
      let thesisId = identifier;
      
      if (type === 'file_url') {
        const thesis = await this.getThesisByFileUrl(identifier);
        thesisId = thesis.thesis_id;
      }

      const { error } = await supabase
        .from('scanned_theses')
        .insert([
          {
            user_id: userId,
            thesis_id: thesisId,
            scanned_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error recording scan:', error);
      // Don't throw error here as it's not critical for the main flow
    }
  },

  // Request access to thesis
  async requestAccess(userId, thesisId) {
    try {
      console.log('Requesting access for user:', userId, 'thesis:', thesisId);
      
      // First check if there's already a pending request
      const { data: existingRequest, error: checkError } = await supabase
        .from('borrowing_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('thesis_id', thesisId)
        .eq('status', 'pending')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        throw checkError;
      }

      if (existingRequest) {
        throw new Error('You already have a pending request for this thesis');
      }

      const { data, error } = await supabase
        .from('borrowing_requests')
        .insert({
          user_id: userId,
          thesis_id: thesisId,
          status: 'pending',
          request_date: new Date().toISOString(),
          duration_days: 7
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to admin
      await this.notifyAdmin('new_request', {
        request_id: data.id,
        user_id: userId,
        thesis_id: thesisId,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      console.error('Error requesting access:', error);
      throw error;
    }
  },

  // Create borrow QR transaction
  async createBorrowQR(userId, thesisId) {
    try {
      console.log('Creating borrow QR for user:', userId, 'thesis:', thesisId);
      
      // Check if thesis is available
      const { data: thesis, error: thesisError } = await supabase
        .from('thesestwo')
        .select('available_copies, title')
        .eq('thesis_id', thesisId)
        .single();

      if (thesisError) throw thesisError;
      if (!thesis) throw new Error('Thesis not found');
      if (thesis.available_copies <= 0) throw new Error('No copies available');

      const transactionId = `BORROW_${Date.now()}_${userId}_${thesisId}`;
      
      const qrData = {
        type: 'borrow',
        transaction_id: transactionId,
        user_id: userId,
        thesis_id: thesisId,
        timestamp: Date.now(),
        expires: Date.now() + (15 * 60 * 1000) // 15 minutes
      };

      // Store the borrow transaction
      const { data, error } = await supabase
        .from('borrow_transactions')
        .insert({
          transaction_id: transactionId,
          user_id: userId,
          thesis_id: thesisId,
          status: 'pending',
          qr_data: qrData,
          expires_at: new Date(qrData.expires).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Borrow QR created successfully:', transactionId);
      return qrData;
    } catch (error) {
      console.error('Error creating borrow QR:', error);
      throw error;
    }
  },

  // Process borrow transaction (for IOT bookshelf)
  async processBorrow(transactionId) {
    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('borrow_transactions')
        .select(`
          *,
          users:user_id (id, full_name, student_id, email),
          thesestwo:thesis_id (thesis_id, title, available_copies)
        `)
        .eq('transaction_id', transactionId)
        .single();

      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status !== 'pending') throw new Error('Transaction already processed');
      if (new Date(transaction.expires_at) < new Date()) throw new Error('QR code expired');
      if (transaction.thesestwo.available_copies <= 0) throw new Error('No copies available');

      // Start a transaction
      const { error: updateError } = await supabase
        .from('borrow_transactions')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId);

      if (updateError) throw updateError;

      // Create borrowing record
      const { error: borrowError } = await supabase
        .from('borrowing_requests')
        .insert({
          user_id: transaction.user_id,
          thesis_id: transaction.thesis_id,
          status: 'approved',
          request_date: new Date().toISOString(),
          approved_date: new Date().toISOString(),
          duration_days: 7,
          borrow_method: 'qr_scan'
        });

      if (borrowError) throw borrowError;

      // Decrease available copies
      const { error: copyError } = await supabase
        .from('thesestwo')
        .update({ 
          available_copies: transaction.thesestwo.available_copies - 1 
        })
        .eq('thesis_id', transaction.thesis_id);

      if (copyError) throw copyError;

      // Notify admin about successful borrow
      await this.notifyAdmin('thesis_borrowed', {
        user_id: transaction.user_id,
        thesis_id: transaction.thesis_id,
        transaction_id: transactionId
      });

      return { 
        success: true, 
        message: 'Thesis borrowed successfully',
        thesis_title: transaction.thesestwo.title,
        user_name: transaction.users.full_name
      };
    } catch (error) {
      console.error('Error processing borrow:', error);
      
      // Update transaction status to failed
      await supabase
        .from('borrow_transactions')
        .update({ status: 'failed' })
        .eq('transaction_id', transactionId);

      throw error;
    }
  },

  // Notify admin about important events
  async notifyAdmin(eventType, data) {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          event_type: eventType,
          data: data,
          created_at: new Date().toISOString(),
          is_read: false
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't throw error here as it's not critical
    }
  },

  // Get admin notifications
  async getAdminNotifications() {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  // Get recent scanned theses
  async getRecentScannedTheses(userId) {
    try {
      const { data, error } = await supabase
        .from('scanned_theses')
        .select(`
          id,
          scanned_at,
          thesestwo (
            thesis_id,
            title,
            author,
            abstract,
            college,
            batch,
            qr_code_url
          )
        `)
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent theses:', error);
      return [];
    }
  },
};