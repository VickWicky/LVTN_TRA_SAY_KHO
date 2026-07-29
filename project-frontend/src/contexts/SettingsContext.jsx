import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    store_name: 'CK Tea',
    contact_phone: '0123 456 789',
    contact_email: 'hello@cktea.vn',
    footer_description: 'Chuyên cung cấp trà sấy khô chất lượng cao, giữ trọn hương vị tự nhiên và dưỡng chất cho sức khỏe gia đình bạn.',
    branches: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/public/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data, branches: data.branches || [] }));
      }
    } catch (error) {
      console.error('Lỗi khi tải cấu hình:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
