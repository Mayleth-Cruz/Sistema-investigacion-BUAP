import React from 'react';
import buapOfficialLogo from '../assets/logo-buap-oficial.png';

const ONLINE_LOGO_URL = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Logo_de_la_BUAP.svg/3840px-Logo_de_la_BUAP.svg.png?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=thumbnail';

/**
 * ============================================================================
 * LOGOTIPO INSTITUCIONAL OFICIAL BUAP
 * ============================================================================
 * Escudo oficial de la Benemérita Universidad Autónoma de Puebla.
 * Carga el recurso gráfico oficial de alta resolución proporcionado por el usuario,
 * optimizado localmente y con respaldo automático al enlace CDN de Wikimedia.
 */
export default function BUAPLogo({ variant = 'azul', showText = true, size = 'normal', style = {} }) {
  const isWhite = variant === 'blanco';
  const primaryColor = isWhite ? '#FFFFFF' : '#003B5C'; // Pantone 302 C
  const accentColor = isWhite ? '#00B5E2' : '#00A3E0';  // Pantone 306 C

  const height = size === 'large' ? 54 : size === 'small' ? 36 : 44;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', userSelect: 'none', ...style }}>
      {/* Escudo Oficial de la BUAP */}
      <img
        src={buapOfficialLogo}
        alt="Escudo Oficial de la BUAP"
        style={{
          height: `${height}px`,
          width: 'auto',
          maxWidth: `${height}px`,
          objectFit: 'contain',
          display: 'block'
        }}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = ONLINE_LOGO_URL;
        }}
      />

      {/* Leyenda Institucional Opcional */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: `1.5px solid ${isWhite ? 'rgba(255,255,255,0.25)' : '#CBD5E1'}`, paddingLeft: '12px' }}>
          <span style={{ 
            fontSize: '11.5px', 
            fontWeight: 800, 
            letterSpacing: '0.04em', 
            textTransform: 'uppercase',
            color: primaryColor,
            lineHeight: 1.15,
            fontFamily: "var(--font-source)"
          }}>
            Benemérita Universidad
          </span>
          <span style={{ 
            fontSize: '11.5px', 
            fontWeight: 800, 
            letterSpacing: '0.04em', 
            textTransform: 'uppercase',
            color: primaryColor,
            lineHeight: 1.15,
            fontFamily: "var(--font-source)"
          }}>
            Autónoma de Puebla
          </span>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 600, 
            letterSpacing: '0.06em', 
            textTransform: 'uppercase',
            color: accentColor,
            marginTop: '2px',
            fontFamily: "var(--font-source)"
          }}>
            Vicerrectoría de Investigación
          </span>
        </div>
      )}
    </div>
  );
}
