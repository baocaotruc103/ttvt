import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Tự quản lý session trong localStorage vì bỏ qua Supabase Auth
        const customSession = localStorage.getItem('custom_session');
        if (customSession) {
          const { user: sessionUser, profile: userProfile } = JSON.parse(customSession);
          
          // Lấy lại thông tin mới nhất từ DB
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single();
            
          if (data && !error) {
            setUser(sessionUser);
            setProfile(data);
          } else {
            localStorage.removeItem('custom_session');
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    
    // Login form truyền email (ví dụ: nhanvien@example.com), ta lấy phần username
    const username = email.includes('@') ? email.split('@')[0] : email;

    try {
      // Tìm user trong bảng profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .eq('mat_khau', password);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userProfile = data[0];
        const sessionUser = { id: userProfile.id, email: email };
        
        setUser(sessionUser);
        setProfile(userProfile);
        
        // Lưu phiên đăng nhập
        localStorage.setItem('custom_session', JSON.stringify({ user: sessionUser, profile: userProfile }));
        
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: { message: 'Tên đăng nhập hoặc mật khẩu không đúng' } };
      }
    } catch (error) {
      setLoading(false);
      return { success: false, error };
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('custom_session');
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
