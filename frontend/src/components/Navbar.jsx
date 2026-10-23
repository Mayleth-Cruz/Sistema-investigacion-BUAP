import React from 'react';
import { Activity, Database, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * ============================================================================
 * COMPONENTE NAVBAR (Barra de Navegación Superior)
 * ============================================================================
 * Muestra el título del módulo activo y el estado de conexión con la API en PHP.
 */
export default function Navbar({ activeTitle, isBackendLive }) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="page-title">{activeTitle}</h1>
      </div>

      <div className="navbar-right">
        {/* Indicador reactivo del estado del Backend PHP */}
        <div 
          className="api-status-badge"
          title={isBackendLive 
            ? "Conectado directamente a la API en PHP y MySQL en http://127.0.0.1:8000" 
            : "Modo Demostración activo. El frontend muestra datos de prueba interactivos."}
        >
          <span className={`status-dot ${isBackendLive ? 'online' : 'offline'}`} />
          <Database size={14} style={{ color: isBackendLive ? '#10b981' : '#f59e0b' }} />
          <span>
            {isBackendLive ? 'API PHP en Vivo' : 'Modo Demostración'}
          </span>
        </div>
      </div>
    </header>
  );
}
