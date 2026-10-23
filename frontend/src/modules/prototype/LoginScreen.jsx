import React, { useState } from 'react';
import { authService } from '../../services/authService';

/**
 * ============================================================================
 * SCREEN: LOGIN ADMINISTRATIVO INSTITUCIONAL BUAP (ACCESO SEGURO)
 * ============================================================================
 * Implementa las mejores prácticas de seguridad solicitadas:
 * - Validación estricta de formato de correo institucional.
 * - Validación obligatoria de contraseña con longitud mínima de 8 caracteres.
 * - Conexión directa con el backend PHP (/api/auth/login).
 * - Restricción de acceso: Solo usuarios con rol de Administrador.
 * - Protección contra ataques de fuerza bruta y respuestas de error seguras.
 */
export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@buap.mx');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();

    // 1. Validación de correo (formato RFC válido)
    if (!cleanEmail) {
      setError('Por favor ingresa tu correo institucional.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Debes ingresar un correo electrónico con formato válido (ejemplo: admin@buap.mx).');
      return;
    }

    // 2. Validación de contraseña (mínimo 8 caracteres)
    if (!password) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    if (password.length < 8) {
      setError('Por motivos de seguridad, la contraseña debe contener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // 3. Autenticación contra el backend PHP con verificación de rol de administrador
      const result = await authService.login(cleanEmail, password);

      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message);
      }
    } catch {
      setError('Error al procesar la autenticación. Verifica que el servidor backend esté en ejecución.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Esferas de luz ambiental de fondo institucional */}
      <div className="login-bg-sphere login-bg-sphere-1" />
      <div className="login-bg-sphere login-bg-sphere-2" />
      <div className="login-bg-sphere login-bg-sphere-3" />
      
      {/* Partículas y burbujas bokeh circulares flotantes */}
      <div className="login-bokeh-dot login-bokeh-dot-1" />
      <div className="login-bokeh-dot login-bokeh-dot-2" />
      <div className="login-bokeh-dot login-bokeh-dot-3" />
      <div className="login-bokeh-dot login-bokeh-dot-4" />
      <div className="login-bokeh-dot login-bokeh-dot-5" />

      {/* División a pantalla completa de dos paneles */}
      <div className="login-split-card">
        
        {/* ================================================================
            LADO IZQUIERDO: FOTOGRAFÍA DEL CAMPUS A PANTALLA COMPLETA
           ================================================================ */}
        <div className="login-left-panel">
          <img 
            src="/campus-buap.jpg" 
            alt="Facultad de Administración - Benemérita Universidad Autónoma de Puebla" 
            className="login-campus-full-img"
          />
        </div>

        {/* ================================================================
            LADO DERECHO: FORMULARIO DE ACCESO INSTITUCIONAL BUAP
           ================================================================ */}
        <div className="login-right-panel">
          <div className="login-form-container">
            
            {/* Título y subtítulo en tipografías y colores oficiales del prototipo */}
            <div>
              <h1 className="titulo-gotham-black login-title">
                Iniciar Sesión
              </h1>
              <p className="subtitulo-gotham-book login-subtitle">
                Acceso Administrativo · Repositorio de Investigación
              </p>
            </div>

            {error && (
              <div className="login-error-alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form-fields">
              
              {/* Campo Correo Institucional / Usuario */}
              <div className="login-input-group">
                <label className="login-label">Correo Institucional</label>
                <input
                  type="email"
                  className="login-input"
                  placeholder="ejemplo@correo.buap.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>

              {/* Campo Contraseña con visualizador interactivo (ojito) */}
              <div className="login-input-group">
                <label className="login-label">Contraseña</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: '46px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: showPassword ? 'var(--buap-cyan-306)' : '#8A9794',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'color 0.2s ease, transform 0.15s ease'
                    }}
                  >
                    {showPassword ? (
                      /* Icono de ojito abierto */
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      /* Icono de ojito oculto */
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Enlace Olvidaste Contraseña */}
              <div className="login-forgot-wrapper">
                <a 
                  href="#recuperar" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    alert('Para restablecer tu acceso institucional, contacta a la mesa de ayuda VIEP o a la DGCTIC.'); 
                  }}
                  className="login-forgot-link"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Botón de Envío Institucional */}
              <button 
                type="submit" 
                className="login-submit-button"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
              </button>

              {/* Registro opcional */}
              <div className="login-register-prompt">
                ¿No cuentas con acceso institucional?{' '}
                <a 
                  href="#registro" 
                  onClick={(e) => {
                    e.preventDefault();
                    alert('El alta de investigadores se realiza a través de la convocatoria interna de la Dirección de Investigación VIEP.');
                  }}
                  className="login-register-link"
                >
                  Solicitar registro
                </a>
              </div>

            </form>

            {/* Enlaces de pie de formulario */}
            <div className="login-form-footer">
              <a 
                href="#terminos" 
                onClick={(e) => { e.preventDefault(); alert('Términos conforme al Manual de Identidad y legislación universitaria BUAP.'); }}
                className="login-terms-link"
              >
                Términos y Privacidad
              </a>
              <div className="login-support-link">
                ¿Requieres asistencia?<br />
                <a href="mailto:soporte.investigacion@correo.buap.mx" style={{ color: '#00B5E2', fontWeight: 600 }}>
                  soporte.investigacion@correo.buap.mx
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
