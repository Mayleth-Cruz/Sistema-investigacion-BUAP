import React from 'react';
import BUAPLogo from '../../components/BUAPLogo';
import { IconArrowLeft } from '../../components/Icons';

/**
 * ============================================================================
 * SCREEN: ACERCA DEL REPOSITORIO INSTITUCIONAL BUAP
 * ============================================================================
 * Jerarquía tipográfica aplicada:
 * - Gotham Black: Título principal
 * - Gotham Book: Subtítulo de bienvenida
 * - Source Sans Pro Black: Encabezados de Misión, Visión y Objetivo
 * - Source Sans Pro Regular: Cuerpo del texto y datos de contacto
 */
export default function AboutScreen({ onBack }) {
  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 72px)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--buap-blue-302)',
            fontFamily: "var(--font-source)",
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <IconArrowLeft size={16} />
          <span>Volver a inicio</span>
        </button>

        <div className="card" style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px' }}>
            <BUAPLogo variant="azul" showText={true} size="large" />
            <h1 className="titulo-gotham-black" style={{ fontSize: '28px', marginTop: '16px', color: 'var(--buap-blue-302)' }}>
              Sistema Integral de Información para la Investigación
            </h1>
            <h2 className="subtitulo-gotham-book" style={{ margin: '6px 0 0 0', fontSize: '15px', color: 'var(--text-muted)' }}>
              Instrumento rector para registrar, monitorear, visualizar y difundir la producción académica y científica.
            </h2>
          </div>

          <div>
            <h3 className="encabezado-source-black" style={{ fontSize: '18px', color: 'var(--buap-blue-302)', marginBottom: '8px' }}>
              Misión
            </h3>
            <p className="cuerpo-texto" style={{ margin: 0, fontSize: '15px' }}>
              La Benemérita Universidad Autónoma de Puebla, como institución pública de educación superior, asume la misión de formar profesionales con alta preparación, ciudadanía crítica, sentido humanista y de comunidades productivas que, con ética rigurosa, contribuyan al desarrollo sustentable y justo de mujeres y hombres del estado de Puebla, del país y de las regiones del mundo donde participen.
            </p>
          </div>

          <div>
            <h3 className="encabezado-source-black" style={{ fontSize: '18px', color: 'var(--buap-blue-302)', marginBottom: '8px' }}>
              Visión
            </h3>
            <p className="cuerpo-texto" style={{ margin: 0, fontSize: '15px' }}>
              La BUAP es reconocida por la excelencia de sus estudiantes, docentes, investigadores y servicios; y por sus diversos aportes de valor a la sociedad local, nacional e internacional.
            </p>
          </div>

          <div>
            <h3 className="encabezado-source-black" style={{ fontSize: '18px', color: 'var(--buap-blue-302)', marginBottom: '8px' }}>
              Objetivo
            </h3>
            <p className="cuerpo-texto" style={{ margin: 0, fontSize: '15px' }}>
              Estructurar de forma sistemática y transparente el acervo de investigación, facilitando la consulta abierta a la comunidad universitaria, evaluadores y la sociedad, con estricto apego a las normas del Manual de Identidad Institucional.
            </p>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '16px', border: '1px solid #E2E8F0', fontSize: '13.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-source)' }}>
            <strong style={{ color: 'var(--buap-blue-302)' }}>Dirección de Comunicación Institucional & Vicerrectoría de Investigación y Estudios de Posgrado (VIEP)</strong><br />
            Torre de Gestión Académica y Servicios Administrativos, 5to. Piso, Ciudad Universitaria.<br />
            Teléfono: (01) 222 229 55 00, Extensión 5269. Puebla, Pue., México.
          </div>
        </div>
      </div>
    </div>
  );
}
