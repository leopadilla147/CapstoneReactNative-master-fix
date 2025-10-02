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

  // In thesisService.js - Update the recordScan function
  async recordScan(userId, identifier, type = 'thesis_id') {
    try {
      // For file URLs, we need to get the thesis_id first
      let thesisId = identifier;
      
      if (type === 'file_url') {
        const thesis = await this.getThesisByFileUrl(identifier);
        thesisId = thesis.thesis_id;
      }

      // Check if this user has already scanned this thesis
      const { data: existingScan, error: checkError } = await supabase
        .from('scanned_theses')
        .select('id, scanned_at')
        .eq('user_id', userId)
        .eq('thesis_id', thesisId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, other errors we should handle
        console.error('Error checking existing scan:', checkError);
      }

      if (existingScan) {
        // Update the existing scan timestamp instead of creating a new one
        const { error: updateError } = await supabase
          .from('scanned_theses')
          .update({
            scanned_at: new Date().toISOString()
          })
          .eq('id', existingScan.id);

        if (updateError) throw updateError;
        console.log('Updated existing scan timestamp for thesis:', thesisId);
      } else {
        // Create new scan record
        const { error: insertError } = await supabase
          .from('scanned_theses')
          .insert([
            {
              user_id: userId,
              thesis_id: thesisId,
              scanned_at: new Date().toISOString()
            }
          ]);

        if (insertError) throw insertError;
        console.log('Created new scan record for thesis:', thesisId);
      }

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
      
      // Remove duplicates by thesis_id, keeping only the most recent scan
      const uniqueTheses = [];
      const seenThesisIds = new Set();
      
      for (const item of data || []) {
        const thesisId = item.thesestwo.thesis_id;
        if (!seenThesisIds.has(thesisId)) {
          seenThesisIds.add(thesisId);
          uniqueTheses.push(item);
        }
      }
      
      return uniqueTheses;
    } catch (error) {
      console.error('Error fetching recent theses:', error);
      return [];
    }
  },


  async getUserBorrowingStatus(userId, thesisId) {
    try {
      console.log('getUserBorrowingStatus called with:', { userId, thesisId });
      
      const { data, error } = await supabase
        .from('borrowing_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('thesis_id', thesisId)
        .order('request_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('Supabase error in getUserBorrowingStatus:', error);
        if (error.code === 'PGRST116') {
          console.log('No borrowing request found');
          return { status: 'none', hasAccess: false };
        }
        throw error;
      }

      if (!data) {
        console.log('No data returned from borrowing_requests');
        return { status: 'none', hasAccess: false };
      }

      console.log('Found borrowing request:', data);
      const now = new Date();
      const approvedDate = new Date(data.approved_date);
      const expiryDate = new Date(approvedDate.getTime() + (data.duration_days * 24 * 60 * 60 * 1000));
      
      const isExpired = data.status === 'approved' && now > expiryDate;
      const hasAccess = data.status === 'approved' && !isExpired;

      console.log('Access calculation:', {
        status: data.status,
        isExpired,
        hasAccess,
        expiryDate: expiryDate.toISOString()
      });

      return {
        ...data,
        hasAccess,
        isExpired,
        expiryDate: expiryDate.toISOString()
      };
    } catch (error) {
      console.error('Error in getUserBorrowingStatus:', error);
      throw error;
    }
  },

// In thesisService.js - Update the getSecurePdfUrl function
  async getSecurePdfUrl(fileUrl) {
    try {
      console.log('Original file_url from database:', fileUrl);
      
      // If fileUrl is already a full Supabase Storage URL, extract just the path
      let filePath = fileUrl;
      
      // Check if it's a full Supabase Storage URL
      if (fileUrl.includes('/storage/v1/object/public/')) {
        // Extract the path after the bucket name
        const urlParts = fileUrl.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          filePath = urlParts[1];
          console.log('Extracted file path from full URL:', filePath);
        }
      } else if (fileUrl.includes('/object/public/')) {
        // Alternative pattern for Supabase URLs
        const urlParts = fileUrl.split('/object/public/');
        if (urlParts.length > 1) {
          filePath = urlParts[1];
          console.log('Extracted file path from alternative URL:', filePath);
        }
      }
      
      // If it's still a full URL, try to extract just the filename
      if (filePath.includes('/') && !filePath.startsWith('thesis-pdfs/')) {
        const pathParts = filePath.split('/');
        const fileName = pathParts[pathParts.length - 1];
        filePath = `thesis-pdfs/${fileName}`;
        console.log('Extracted filename and created path:', filePath);
      }
      
      // Ensure the path starts with the correct folder
      if (!filePath.startsWith('thesis-pdfs/')) {
        filePath = `thesis-pdfs/${filePath}`;
        console.log('Added thesis-pdfs/ prefix:', filePath);
      }

      console.log('Final file path for signed URL:', filePath);
      
      // Create signed URL that expires in 1 hour
      const { data, error } = await supabase.storage
        .from('thesis_files') // Make sure this matches your bucket name exactly
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(`Storage error: ${error.message}`);
      }
      
      if (!data || !data.signedUrl) {
        throw new Error('No signed URL returned from Supabase');
      }
      
      console.log('Generated signed URL successfully');
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating secure PDF URL:', error);
      throw error;
    }
  },

  // Add this to thesisService.js for debugging
  async debugStorageContents() {
    try {
      console.log('Debugging storage contents...');
      
      // List all files in the thesis_files bucket
      const { data, error } = await supabase.storage
        .from('thesis_files')
        .list('thesis-pdfs', {
          limit: 100,
          offset: 0,
        });
      
      if (error) {
        console.error('Error listing storage:', error);
        return;
      }
      
      console.log('Files in storage:', data);
      
      // Also try to list the root to see bucket structure
      const { data: rootData, error: rootError } = await supabase.storage
        .from('thesis_files')
        .list('', {
          limit: 100,
          offset: 0,
        });
      
      if (!rootError && rootData) {
        console.log('Root folder contents:', rootData);
      }
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  },

  async recordThesisView(userId, thesisId) {
    try {
      const { error } = await supabase
        .from('thesis_views')
        .insert({
          user_id: userId,
          thesis_id: thesisId,
          viewed_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error recording thesis view:', error);
      // Don't throw as this is not critical
    }
  }


};