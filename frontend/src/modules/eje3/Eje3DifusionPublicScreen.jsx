import React, { useState } from 'react';
import { IconArrowLeft, IconCalendar } from '../../components/Icons';
import { eje3Service, EJE3_LOAD_ERROR_PUBLIC } from '../../services/eje3Service';
import { formatRangoFechas, CONGRESO_TITULO, TIPOS_EVENTO, ESTADOS_EVENTO } from './registroConfig';
import { Eje3Notice, Eje3PageHeader } from './Eje3Common';
import { useEje3Data, formatNumber } from './eje3Hooks';

const labelOf = (options, value) => (options.find((o) => o.value === value) || {}).label || value || '';

function EventoMeta({ evento }) {
  return (
    <div className="eje3-event-meta">
      <span>
        <IconCalendar size={14} color="#003B5C" /> {formatRangoFechas(evento.fecha_inicio, evento.fecha_fin)}
      </span>
      {evento.sede && <span>Sede: {evento.sede}</span>}
      {evento.edicion && <span>Edición: {evento.edicion}</span>}
      {evento.estado && <span className="tag">{labelOf(ESTADOS_EVENTO, evento.estado)}</span>}
    </div>
  );
}

function EventoCard({ evento, interactive, onOpen, children, showCounts }) {
  return (
    <article className="card eje3-event-card" aria-label={evento.nombre}>
      <h3 className="titulo-gotham-black eje3-event-title">{evento.nombre}</h3>
      <EventoMeta evento={evento} />
      {evento.descripcion && <p className="eje3-event-desc">{evento.descripcion}</p>}
      {showCounts && (
        <div className="eje3-event-counts">
          <span className="tag">{formatNumber(evento.total_proyectos)} proyectos</span>
          <span className="tag">{formatNumber(evento.total_publicaciones)} publicaciones</span>
        </div>
      )}
      {children}
      {interactive && (
        <button
          type="button"
          className="btn btn2"
          style={{ marginTop: '12px' }}
          onClick={() => onOpen(evento.id)}
          aria-label={`Ver detalle de ${evento.nombre}`}
        >
          Ver detalle
        </button>
      )}
    </article>
  );
}

function ProyectoSemillero({ proyecto }) {
  const apartados = Array.isArray(proyecto.apartados) ? proyecto.apartados : [];
  return (
    <details className="eje3-proyecto">
      <summary>
        <span className="eje3-proyecto-title">{proyecto.titulo}</span>
        <span className="muted eje3-proyecto-author">
          {proyecto.codigo ? `${proyecto.codigo} · ` : ''}
          {proyecto.investigador_principal_nombre}
        </span>
      </summary>
      {apartados.length === 0 ? (
        <p className="muted" style={{ margin: '8px 0 0' }}>Este proyecto no tiene apartados anexos.</p>
      ) : (
        <div className="eje3-apartados-view">
          {apartados.map((a, i) => (
            <div key={`${a.apartado}-${i}`}>
              <h5>{a.apartado}</h5>
              {a.contenido && <p>{a.contenido}</p>}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

/**
 * Contenido de la difusión (reutilizado en la página pública y en la vista
 * previa del administrador). `interactive` habilita "Ver detalle".
 */
export function Eje3DifusionContent({ data, interactive = true, onOpenEvento }) {
  const semilleros = Array.isArray(data.semilleros) ? data.semilleros : [];
  const congreso = Array.isArray(data.congreso) ? data.congreso : [];
  const otros = Array.isArray(data.otros_eventos) ? data.otros_eventos : [];
  const proximos = Array.isArray(data.proximos) ? data.proximos : [];

  return (
    <>
      <section aria-label="Próximos eventos">
        <h2 className="encabezado-source-black eje3-section-title">Próximos eventos</h2>
        {proximos.length === 0 ? (
          <p className="muted">No hay eventos próximos programados.</p>
        ) : (
          <div className="eje3-event-grid">
            {proximos.map((e) => (
              <article key={e.id} className="card eje3-next-card" aria-label={`Próximo evento: ${e.nombre}`}>
                <span className="eje3-next-date">{formatRangoFechas(e.fecha_inicio, e.fecha_fin)}</span>
                <strong>{e.nombre}</strong>
                {e.sede && <span className="muted">{e.sede}</span>}
                {interactive && (
                  <button type="button" className="eje3-link-btn" onClick={() => onOpenEvento(e.id)} aria-label={`Ver detalle de ${e.nombre}`}>
                    Ver detalle
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Semilleros de investigación">
        <h2 className="encabezado-source-black eje3-section-title">Eventos de semilleros de investigación</h2>
        {semilleros.length === 0 ? (
          <p className="muted">Aún no hay eventos de semilleros publicados.</p>
        ) : (
          <div className="eje3-event-list">
            {semilleros.map((e) => {
              const proyectos = Array.isArray(e.proyectos) ? e.proyectos : [];
              return (
                <EventoCard key={e.id} evento={e} interactive={interactive} onOpen={onOpenEvento}>
                  <div className="eje3-proyectos">
                    <h4 className="eje3-proyectos-title">Proyectos de semilleros ({proyectos.length})</h4>
                    {proyectos.length === 0 ? (
                      <p className="muted" style={{ margin: 0 }}>Sin proyectos registrados para este evento.</p>
                    ) : (
                      proyectos.map((p) => <ProyectoSemillero key={p.id} proyecto={p} />)
                    )}
                  </div>
                </EventoCard>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label={CONGRESO_TITULO}>
        <h2 className="encabezado-source-black eje3-section-title">{CONGRESO_TITULO}</h2>
        {congreso.length === 0 ? (
          <p className="muted">Aún no hay ediciones del congreso publicadas.</p>
        ) : (
          <div className="eje3-event-list">
            {congreso.map((e) => (
              <EventoCard key={e.id} evento={e} interactive={interactive} onOpen={onOpenEvento} showCounts />
            ))}
          </div>
        )}
      </section>

      {otros.length > 0 && (
        <section aria-label="Otros eventos">
          <h2 className="encabezado-source-black eje3-section-title">Otros eventos</h2>
          <div className="eje3-event-list">
            {otros.map((e) => (
              <EventoCard key={e.id} evento={e} interactive={interactive} onOpen={onOpenEvento} showCounts />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Detalle de un evento público (proyectos y publicaciones ligadas). */
function EventoDetalle({ eventoId, onBack }) {
  const { data, loading, failed } = useEje3Data(() => eje3Service.getDifusionEvento(eventoId), [eventoId]);
  const proyectos = data && Array.isArray(data.proyectos) ? data.proyectos : [];
  const publicaciones = data && Array.isArray(data.publicaciones) ? data.publicaciones : [];

  return (
    <>
      <div>
        <button type="button" className="btn btn2" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <IconArrowLeft size={14} />
          <span>Volver a eventos</span>
        </button>
      </div>

      {failed && <Eje3Notice>{EJE3_LOAD_ERROR_PUBLIC}</Eje3Notice>}
      {loading && !data && <p className="muted">Cargando evento...</p>}

      {data && (
        <>
          <Eje3PageHeader title={data.nombre} subtitle={labelOf(TIPOS_EVENTO, data.tipo)} />
          <div className="card" style={{ padding: '20px' }}>
            <EventoMeta evento={data} />
            {data.descripcion && <p className="eje3-event-desc">{data.descripcion}</p>}
          </div>

          <section aria-label="Proyectos del evento">
            <h2 className="encabezado-source-black eje3-section-title">Proyectos presentados ({proyectos.length})</h2>
            {proyectos.length === 0 ? (
              <p className="muted">Este evento aún no tiene proyectos registrados.</p>
            ) : (
              <div className="card" style={{ padding: '16px 20px' }}>
                {proyectos.map((p) => (
                  <ProyectoSemillero key={p.id} proyecto={p} />
                ))}
              </div>
            )}
          </section>

          <section aria-label="Publicaciones del evento">
            <h2 className="encabezado-source-black eje3-section-title">Publicaciones derivadas ({publicaciones.length})</h2>
            {publicaciones.length === 0 ? (
              <p className="muted">Este evento aún no tiene publicaciones ligadas.</p>
            ) : (
              <ul className="eje3-pub-list card">
                {publicaciones.map((p) => (
                  <li key={p.id}>
                    <strong>{p.titulo}</strong>
                    <span className="muted">
                      {p.autores}
                      {p.anio ? ` · ${p.anio}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

/**
 * ============================================================================
 * SCREEN PÚBLICA: EVENTOS Y CONGRESO (Eje3DifusionPublicScreen)
 * ============================================================================
 */
export default function Eje3DifusionPublicScreen() {
  const [eventoId, setEventoId] = useState(null);
  const { data, loading, failed } = useEje3Data(() => eje3Service.getDifusion(), []);

  const openEvento = (id) => {
    setEventoId(id);
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="eje3-public-wrap">
      {eventoId !== null ? (
        <EventoDetalle eventoId={eventoId} onBack={() => setEventoId(null)} />
      ) : (
        <>
          <Eje3PageHeader
            title="Eventos de investigación"
            subtitle="Semilleros de investigación y Congreso Internacional de Investigación en Ciencias Económico Administrativas."
          />
          {failed && <Eje3Notice>{EJE3_LOAD_ERROR_PUBLIC}</Eje3Notice>}
          {loading && !data && <p className="muted">Cargando eventos...</p>}
          {data && <Eje3DifusionContent data={data} onOpenEvento={openEvento} />}
        </>
      )}
    </div>
  );
}
