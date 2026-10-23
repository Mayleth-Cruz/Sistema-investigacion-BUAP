import React, { useState } from 'react';
import BUAPHeader from './components/BUAPHeader';
import BUAPFooter from './components/BUAPFooter';
import HomeSearchScreen from './modules/prototype/HomeSearchScreen';
import ArticleDetailScreen from './modules/prototype/ArticleDetailScreen';
import AdminPanelScreen from './modules/prototype/AdminPanelScreen';
import AdminUploadScreen from './modules/prototype/AdminUploadScreen';
import AdminAuthorsScreen from './modules/prototype/AdminAuthorsScreen';
import AdminCategoriesScreen from './modules/prototype/AdminCategoriesScreen';
import AboutScreen from './modules/prototype/AboutScreen';
import LoginScreen from './modules/prototype/LoginScreen';
import YearFoldersScreen from './modules/prototype/YearFoldersScreen';
import { authService } from './services/authService';

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL (App.jsx) - SISTEMA BUAP
 * ============================================================================
 * Orquesta la navegación y el flujo de autenticación institucional:
 * - 'home': Usuario: inicio y búsqueda
 * - 'carpetas': Usuario: explorador de artículos organizados en carpetas por año
 * - 'detail': Usuario: detalle del artículo
 * - 'login': Acceso administrativo (Login institucional con datos de prueba)
 * - 'admin-panel': Admin: panel y listado
 * - 'admin-upload': Admin: subir o editar artículo
 * - 'acerca': Misión, Visión e identidad universitaria
 */
export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [previousView, setPreviousView] = useState('home');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Estado de sesión del administrador sincronizado con el backend
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [userSession, setUserSession] = useState(() => authService.getCurrentUser());

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setPreviousView(currentView === 'detail' ? 'home' : currentView);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditArticle = (article) => {
    setArticleToEdit(article);
    setCurrentView('admin-upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadNewClick = () => {
    setArticleToEdit(null);
    setCurrentView('admin-upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view) => {
    // Si intenta ingresar a administración sin estar autenticado, enviar a login
    if (view.startsWith('admin') && !isAuthenticated) {
      setCurrentView('login');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUserSession(userData);
    showToast(`Bienvenida(o), ${userData.nombre}`);
    setCurrentView('admin-panel');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUserSession(null);
    showToast('Sesión cerrada correctamente.');
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      minHeight: '100dvh',
      display: 'flex', 
      flexDirection: 'column', 
      background: 'var(--bg-page)',
      overflowX: 'hidden'
    }}>
      {/* 1. Encabezado Oficial BUAP con control de sesión */}
      <BUAPHeader 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />

      {/* 2. Pantalla Activa */}
      <main style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0 
      }}>
        {currentView === 'home' && (
          <HomeSearchScreen 
            onSelectArticle={handleSelectArticle}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'carpetas' && (
          <YearFoldersScreen 
            onSelectArticle={handleSelectArticle}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'detail' && (
          <ArticleDetailScreen 
            article={selectedArticle}
            onBack={() => handleNavigate(previousView || 'home')}
          />
        )}

        {currentView === 'login' && (
          <LoginScreen 
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentView === 'admin-panel' && (
          <AdminPanelScreen 
            onNavigate={handleNavigate}
            onEditArticle={handleEditArticle}
            onUploadClick={handleUploadNewClick}
            activeNav="panel"
            showToast={showToast}
          />
        )}

        {currentView === 'admin-upload' && (
          <AdminUploadScreen 
            onNavigate={handleNavigate}
            articleToEdit={articleToEdit}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-authors' && (
          <AdminAuthorsScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-categories' && (
          <AdminCategoriesScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'acerca' && (
          <AboutScreen 
            onBack={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* 3. Notificación Flotante Institucional */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          background: '#003B5C',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          fontFamily: "'Source Sans 3', sans-serif",
          fontSize: '14px',
          fontWeight: 600,
          borderLeft: '4px solid #00B5E2'
        }}>
          {toastMessage}
        </div>
      )}

      {/* 4. Pie de Página Institucional BUAP (en vistas públicas) */}
      {!currentView.startsWith('admin') && currentView !== 'login' && (
        <BUAPFooter />
      )}
    </div>
  );
}
