// services/authService.js
import { supabase } from '../config/supabase';

export const authService = {
  async loginUser(username, password) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error || !user) {
        throw new Error('Invalid username or password');
      }

      if (user.status !== 'active') {
        throw new Error('Your account is inactive. Please contact administrator.');
      }

      if (user.password !== password) {
        throw new Error('Invalid username or password');
      }

      if (user.role !== 'user') {
        throw new Error('Access denied. This portal is for students only.');
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        studentId: user.student_id,
        college: user.college,
        course: user.course,
        yearLevel: user.year_level
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async registerUser(userData) {
    try {
      // Check if username exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', userData.username)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Username already exists. Please choose a different one.');
      }

      // Check if student ID exists
      const { data: existingStudent } = await supabase
        .from('users')
        .select('student_id')
        .eq('student_id', userData.studentId)
        .maybeSingle();

      if (existingStudent) {
        throw new Error('Student ID already registered. Please use a different student ID.');
      }

      // Insert new user
      const { data, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username: userData.username,
            password: userData.password,
            role: 'user',
            full_name: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            student_id: userData.studentId,
            college: userData.college,
            course: userData.course,
            year_level: userData.yearLevel,
            status: 'active'
          }
        ])
        .select();

      if (insertError) throw insertError;
      return data[0];

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },async validateSession(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, status')
        .eq('id', userId)
        .eq('status', 'active')
        .single();

      if (error || !user) {
        throw new Error('Session expired or user not found');
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      throw error;
    }
  },

  async verifyPassword(username, password) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error || !user) {
        throw new Error('Invalid username or password');
      }

      if (user.password !== password) {
        throw new Error('Invalid password');
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        studentId: user.student_id,
        college: user.college,
        course: user.course,
        yearLevel: user.year_level
      };
    } catch (error) {
      console.error('Password verification error:', error);
      throw error;
    }
  }
};