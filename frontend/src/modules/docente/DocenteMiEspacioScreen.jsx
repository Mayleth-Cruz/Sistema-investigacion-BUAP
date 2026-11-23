import React from 'react';
import DocenteSidebar from '../../components/DocenteSidebar';
import { IconPlus } from '../../components/Icons';
import { docenteService } from '../../services/docenteService';
import { EJE3_LOAD_ERROR } from '../../services/eje3Service';
import { Eje3Notice, Eje3PageHeader, RegistroEstadoTag } from '../eje3/Eje3Common';
import { useEje3Data, formatNumber } from '../eje3/eje3Hooks';
import { REGISTRO_ESTADOS, labelTipoProyecto } from '../eje3/registroConfig';

const ORIGEN_PUBLICACION = { evento: 'Evento', revista_pyad: 'Revista PYAD', otra: 'Otra' };
const MAX_RECIENTES = 5;

/**
 * ============================================================================
 * SCREEN: DOCENTE · MI ESPACIO (DocenteMiEspacioScreen)
 * ============================================================================
 * Resumen personal del docente: sus datos y nivel SNII, tarjetas con la
 * cantidad de proyectos por estado de registro, una lista corta de proyectos
 * recientes y, de solo lectura, sus publicaciones y producción técnica.
 */
export default function DocenteMiEspacioScreen({ onNavigate, user }) {
  const resumen = useEje3Data(() => docenteService.resumen(), []);
  const proyectos = useEje3Data(() => docenteService.proyectos.list(), []);

  const r = resumen.data;
  const docente = r && r.docente ? r.docente : null;
  const porEstado = (r && r.proyectos_por_estado) || {};
  const recientes = Array.isArray(proyectos.data) ? proyectos.data.slice(0, MAX_RECIENTES) : [];
  const publicaciones = r && Array.isArray(r.publicaciones) ? r.publicaciones : [];
  const produccion = r && Array.isArray(r.produccion_tecnica) ? r.produccion_tecnica : [];
  const devueltos = Number(porEstado.devuelto) || 0;

  const nombre = (docente && docente.nombre_completo) || (user && user.nombre) || '';
  const irProyectos = () => onNavigate && onNavigate('docente-proyectos');

  return (
    <div className="admin-layout-wrapper">
      <DocenteSidebar activeNav="mi-espacio" onNavigate={onNavigate} nombre={nombre} />

      <div className="admin-content-area" style={{ maxWidth: '1200px' }}>
        <Eje3PageHeader
          title="Mi espacio"
          subtitle={nombre ? `Bienvenida(o), ${nombre}. Aquí ves el avance de tus proyectos y tu producción.` : 'Resumen de tus proyectos y tu producción.'}
        >
          <button type="button" className="btn" onClick={irProyectos} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <IconPlus size={14} />
            <span>Registrar proyecto</span>
          </button>
        </Eje3PageHeader>

        {resumen.failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}

        {devueltos > 0 && (
          <Eje3Notice tone="info">
            <span data-testid="aviso-devueltos">
              {devueltos === 1
                ? 'Tienes 1 proyecto devuelto con comentarios del administrador.'
                : `Tienes ${formatNumber(devueltos)} proyectos devueltos con comentarios del administrador.`}
            </span>{' '}
            <button type="button" className="eje3-link-btn" onClick={irProyectos}>
              Revisar y corregir
            </button>
          </Eje3Notice>
        )}

        {/* Datos del docente y SNII */}
        <section className="card docente-perfil" aria-label="Mis datos">
          <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>Mis datos</h2>
          {resumen.loading && !docente ? (
            <p className="muted">Cargando...</p>
          ) : docente ? (
            <dl className="docente-datos">
              <div><dt>Nombre</dt><dd>{docente.nombre_completo}</dd></div>
              {docente.correo && <div><dt>Correo</dt><dd>{docente.correo}</dd></div>}
              {docente.afiliacion && <div><dt>Afiliación</dt><dd>{docente.afiliacion}</dd></div>}
              {docente.categoria && <div><dt>Categoría</dt><dd>{docente.categoria}</dd></div>}
              {docente.linea_investigacion && <div><dt>Línea de investigación</dt><dd>{docente.linea_investigacion}</dd></div>}
              <div>
                <dt>Nivel SNII</dt>
                <dd data-testid="snii">
                  {docente.snii_nivel ? (
                    <span className="tag">{`SNII ${docente.snii_nivel}`}</span>
                  ) : Number(docente.snii_elegible) === 1 ? (
                    <span className="tag">Elegible a SNII</span>
                  ) : (
                    <span className="muted">Sin nivel SNII</span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted">No hay información disponible.</p>
          )}
        </section>

        {/* Tarjetas por estado de registro */}
        <section aria-label="Proyectos por estado">
          <div className="docente-estado-grid">
            {REGISTRO_ESTADOS.map((e) => (
              <button
                key={e.value}
                type="button"
                className={`card docente-estado-card docente-estado-card-${e.value}`}
                onClick={irProyectos}
                aria-label={`${e.label}: ${formatNumber(porEstado[e.value])}`}
              >
                <span className="docente-estado-count titulo-gotham-black" data-testid={`conteo-${e.value}`}>
                  {resumen.loading && !r ? '...' : r ? formatNumber(porEstado[e.value]) : '—'}
                </span>
                <span className="docente-estado-label">{e.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Proyectos recientes */}
        <section className="card" aria-label="Proyectos recientes">
          <div className="eje3-page-header" style={{ marginBottom: '12px' }}>
            <h2 className="encabezado-source-black eje3-section-title" style={{ margin: 0 }}>Proyectos recientes</h2>
            <button type="button" className="eje3-link-btn" onClick={irProyectos}>
              Ver todos mis proyectos
            </button>
          </div>
          {proyectos.failed && !resumen.failed && <Eje3Notice>{EJE3_LOAD_ERROR}</Eje3Notice>}
          {proyectos.loading && proyectos.data === null ? (
            <p className="muted">Cargando proyectos...</p>
          ) : proyectos.failed ? (
            <p className="muted">No hay información disponible.</p>
          ) : recientes.length === 0 ? (
            <p className="muted">Aún no has registrado proyectos. Usa "Registrar proyecto" para comenzar.</p>
          ) : (
            <ul className="docente-reciente-list">
              {recientes.map((p) => (
                <li key={p.id}>
                  <div className="docente-reciente-main">
                    <strong>{p.titulo}</strong>
                    <span className="muted">{[p.codigo, labelTipoProyecto(p.tipo)].filter(Boolean).join(' · ')}</span>
                    {p.registro_estado === 'devuelto' && p.comentario_revision && (
                      <span className="docente-reciente-comentario">Comentario: {p.comentario_revision}</span>
                    )}
                  </div>
                  <RegistroEstadoTag value={p.registro_estado} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Producción (solo lectura) */}
        <div className="eje3-two-col">
          <section className="card" aria-label="Mis publicaciones">
            <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
              Mis publicaciones{r ? ` (${formatNumber(r.total_publicaciones)})` : ''}
            </h2>
            {publicaciones.length === 0 ? (
              <p className="muted">{r ? 'Sin publicaciones registradas.' : 'No hay información disponible.'}</p>
            ) : (
              <ul className="eje3-pub-list docente-pub-list">
                {publicaciones.map((pub) => (
                  <li key={pub.id}>
                    <strong>{pub.titulo}</strong>
                    <span className="muted">
                      {Array.from(new Set([pub.anio, pub.revista_editorial, ORIGEN_PUBLICACION[pub.origen]].filter(Boolean))).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-label="Mi producción técnica">
            <h2 className="encabezado-source-black eje3-section-title" style={{ marginTop: 0 }}>
              Mi producción técnica{r ? ` (${formatNumber(r.total_produccion_tecnica)})` : ''}
            </h2>
            {produccion.length === 0 ? (
              <p className="muted">{r ? 'Sin producción técnica registrada.' : 'No hay información disponible.'}</p>
            ) : (
              <ul className="eje3-pub-list docente-pub-list">
                {produccion.map((t) => (
                  <li key={t.id}>
                    <strong>{t.titulo}</strong>
                    <span className="muted">{[t.tipo, t.anio].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
          Las publicaciones, la producción técnica y el nivel SNII los captura el administrador; aquí solo puedes consultarlos.
        </p>
      </div>
    </div>
  );
}
