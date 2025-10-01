// services/mockAuthService.js
export const mockAuthService = {
  async loginUser(username, password) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (username === 'student' && password === 'password') {
      return {
        id: 1,
        username: 'student',
        role: 'user',
        fullName: 'John Doe',
        email: 'john.doe@cnsc.edu.ph',
        studentId: '2023-00123',
        college: 'College of Information and Communications Technology',
        course: 'Bachelor of Science in Information Technology',
        yearLevel: '3rd Year'
      };
    } else {
      throw new Error('Invalid username or password');
    }
  },

  async registerUser(userData) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { id: Date.now(), ...userData };
  }
};