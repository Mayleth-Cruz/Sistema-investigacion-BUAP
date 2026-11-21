import React, { useState, useEffect } from 'react';
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
import Eje3RegistroScreen from './modules/eje3/Eje3RegistroScreen';
import Eje3MonitoreoScreen from './modules/eje3/Eje3MonitoreoScreen';
import Eje3VisualizarScreen from './modules/eje3/Eje3VisualizarScreen';
import Eje3DifundirScreen from './modules/eje3/Eje3DifundirScreen';
import Eje3DifusionPublicScreen from './modules/eje3/Eje3DifusionPublicScreen';
import AdminDocentesUsuariosScreen from './modules/eje3/AdminDocentesUsuariosScreen';
import AdminDocentesRevisionScreen from './modules/eje3/AdminDocentesRevisionScreen';
import DocenteMiEspacioScreen from './modules/docente/DocenteMiEspacioScreen';
import DocenteProyectosScreen from './modules/docente/DocenteProyectosScreen';
import DocenteCuentaScreen from './modules/docente/DocenteCuentaScreen';
import { authService } from './services/authService';
import { SESSION_EXPIRED_EVENT, PASSWORD_CHANGE_EVENT } from './services/api';

/**
 * ============================================================================
 * COMPONENTE PRINCIPAL (App.jsx) - SISTEMA BUAP
 * ============================================================================
 * Orquesta la navegación y el flujo de autenticación institucional:
 * - 'home': Usuario: inicio y búsqueda
 * - 'carpetas': Usuario: explorador de artículos organizados en carpetas por año
 * - 'detail': Usuario: detalle del artículo
 * - 'login': Acceso institucional (administrador o docente; enruta según el rol)
 * - 'admin-panel': Admin: panel y listado
 * - 'admin-upload': Admin: subir o editar artículo
 * - 'acerca': Misión, Visión e identidad universitaria
 * - 'eje3-difusion': Usuario: eventos y congreso (Eje 3)
 * - 'admin-eje3-registro' | 'admin-eje3-monitoreo' | 'admin-eje3-visualizar'
 *   | 'admin-eje3-difundir': Admin: Eje 3 · Investigación
 *   (Visualizar / producción académica vive solo en la zona de administración)
 * - 'admin-docentes-usuarios' | 'admin-docentes-revision': Admin: cuentas de
 *   docentes y revisión de los proyectos que envían
 * - 'docente-mi-espacio' | 'docente-proyectos' | 'docente-cuenta': Docente
 *   (si debe cambiar su contraseña temporal, solo 'docente-cuenta')
 */
export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [previousView, setPreviousView] = useState('home');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleToEdit, setArticleToEdit] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Estado de sesión sincronizado con el backend: isAuthenticated = sesión de
  // ADMINISTRADOR; isDocente = sesión de docente (rol 'investigador')
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [isDocente, setIsDocente] = useState(() => authService.isDocente());
  const [mustChangePassword, setMustChangePassword] = useState(() => authService.mustChangePassword());
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

  // Vista inicial de un docente: si debe cambiar su contraseña, solo "Mi cuenta"
  const docenteHome = (mustChange) => (mustChange ? 'docente-cuenta' : 'docente-mi-espacio');

  const handleNavigate = (view) => {
    if (view.startsWith('admin')) {
      // Administración: solo administrador. Docente → su espacio; sin sesión → login
      if (isAuthenticated) setCurrentView(view);
      else if (isDocente) setCurrentView(docenteHome(mustChangePassword));
      else setCurrentView('login');
    } else if (view.startsWith('docente-')) {
      // Espacio docente: solo docente. Admin → su panel; sin sesión → login
      if (isDocente) setCurrentView(mustChangePassword ? 'docente-cuenta' : view);
      else if (isAuthenticated) setCurrentView('admin-panel');
      else setCurrentView('login');
    } else if (view === 'eje3-visualizar') {
      // Producción académica ya no tiene ruta pública (solo admin-eje3-visualizar)
      setCurrentView('home');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userData) => {
    setUserSession(userData);
    if (authService.isDocente()) {
      const mustChange = Boolean(userData.debe_cambiar_password);
      setIsAuthenticated(false);
      setIsDocente(true);
      setMustChangePassword(mustChange);
      showToast(
        mustChange
          ? `Bienvenida(o) a tu espacio, ${userData.nombre}. Cambia tu contraseña temporal para continuar.`
          : `Bienvenida(o) a tu espacio, ${userData.nombre}`
      );
      setCurrentView(docenteHome(mustChange));
    } else {
      setIsAuthenticated(true);
      setIsDocente(false);
      setMustChangePassword(false);
      showToast(`Bienvenida(o), ${userData.nombre}`);
      setCurrentView('admin-panel');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearLocalSession = () => {
    setIsAuthenticated(false);
    setIsDocente(false);
    setMustChangePassword(false);
    setUserSession(null);
  };

  const handleLogout = () => {
    authService.logout();
    clearLocalSession();
    showToast('Sesión cerrada correctamente.');
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePasswordChanged = () => {
    setUserSession(authService.getCurrentUser());
    setMustChangePassword(false);
    setCurrentView('docente-mi-espacio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // La API avisa por eventos de ventana cuando la sesión expira (401 con token)
  // o cuando el backend exige cambiar la contraseña temporal (403).
  useEffect(() => {
    const onExpired = () => {
      clearLocalSession();
      setToastMessage('Tu sesión expiró. Inicia sesión de nuevo.');
      setTimeout(() => setToastMessage(null), 3500);
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const onPasswordRequired = () => {
      if (!authService.isDocente()) return;
      authService.markPasswordChangeRequired();
      setUserSession(authService.getCurrentUser());
      setMustChangePassword(true);
      setCurrentView('docente-cuenta');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener(PASSWORD_CHANGE_EVENT, onPasswordRequired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener(PASSWORD_CHANGE_EVENT, onPasswordRequired);
    };
  }, []);

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
        isDocente={isDocente}
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

        {currentView === 'admin-eje3-registro' && (
          <Eje3RegistroScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-eje3-monitoreo' && (
          <Eje3MonitoreoScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-eje3-visualizar' && (
          <Eje3VisualizarScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-eje3-difundir' && (
          <Eje3DifundirScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-docentes-usuarios' && isAuthenticated && (
          <AdminDocentesUsuariosScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-docentes-revision' && isAuthenticated && (
          <AdminDocentesRevisionScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
          />
        )}

        {currentView === 'docente-mi-espacio' && isDocente && (
          <DocenteMiEspacioScreen 
            onNavigate={handleNavigate}
            user={userSession}
          />
        )}

        {currentView === 'docente-proyectos' && isDocente && (
          <DocenteProyectosScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
            user={userSession}
          />
        )}

        {currentView === 'docente-cuenta' && isDocente && (
          <DocenteCuentaScreen 
            onNavigate={handleNavigate}
            showToast={showToast}
            user={userSession}
            obligatorio={mustChangePassword}
            onPasswordChanged={handlePasswordChanged}
          />
        )}

        {currentView === 'eje3-difusion' && (
          <Eje3DifusionPublicScreen />
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
      {!currentView.startsWith('admin') && !currentView.startsWith('docente') && currentView !== 'login' && (
        <BUAPFooter />
      )}
    </div>
  );
}
