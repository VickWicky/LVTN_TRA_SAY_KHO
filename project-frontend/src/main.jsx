import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { WishlistProvider } from './contexts/WishlistContext.jsx';
import { SettingsProvider } from './contexts/SettingsContext.jsx';

// Lấy mã Client ID từ file .env
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)