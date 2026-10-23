import React from 'react';
import '../../styles/campus-css-art.css';

/**
 * ============================================================================
 * COMPONENTE: CAMPUS CSS ART (FACULTAD DE ADMINISTRACIÓN BUAP)
 * ============================================================================
 * Recreación 100% en CSS puro sin imágenes rasterizadas de la fotografía original:
 * - Diseñado enteramente con cajas, gradientes, bordes y clip-paths CSS.
 * - Todos los colores, tonos y proporciones son controlados por variables CSS
 *   definidas al inicio de `campus-css-art.css` para facilitar cualquier ajuste.
 */
export default function CampusCssArt() {
  return (
    <div className="css-campus-scene" aria-label="Facultad de Administración BUAP recreada en CSS puro">
      
      {/* 1. Arbolado de fondo detrás del edificio */}
      <div className="css-bg-treeline">
        <div className="css-bg-tree-cluster css-bg-tree-1" />
        <div className="css-bg-tree-cluster css-bg-tree-2" />
        <div className="css-bg-tree-cluster css-bg-tree-3" />
        <div className="css-bg-tree-cluster css-bg-tree-4" />
      </div>

      {/* 2. Edificio Principal: Facultad de Administración */}
      <div className="css-building-facade">
        
        {/* Ala Izquierda (3 niveles con ventanería de cancelería verde reflectante) */}
        <div className="css-building-wing">
          {/* Nivel 3 (Superior) */}
          <div className="css-window-floor">
            <div className="css-window-pane" />
            <div className="css-window-pane" />
            <div className="css-window-pane" />
          </div>
          {/* Nivel 2 (Intermedio) */}
          <div className="css-window-floor">
            <div className="css-window-pane" />
            <div className="css-window-pane" />
            <div className="css-window-pane" />
          </div>
          {/* Nivel 1 (Planta Baja) */}
          <div className="css-window-floor">
            <div className="css-window-pane" />
            <div className="css-window-pane" />
            <div className="css-window-pane" />
          </div>
        </div>

        {/* Pórtico Central Verde Olivo con Rótulo Institucional */}
        <div className="css-building-portico">
          <div className="css-portico-header">
            <span className="css-portico-title">Facultad de Administración</span>
          </div>
          <div className="css-portico-glass-wall">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="css-glass-tile" />
            ))}
          </div>
          <div className="css-portico-doors">
            <div className="css-portico-door" />
            <div className="css-portico-door" />
            <div className="css-portico-door" />
            <div className="css-portico-door" />
          </div>

          {/* Asta con Bandera de México ondeando suavemente */}
          <div className="css-flagpole-wrapper">
            <div className="css-flagpole-finial" />
            <div className="css-flagpole" />
            <div className="css-flag-tricolor">
              <div className="css-flag-stripe-green" />
              <div className="css-flag-stripe-white" />
              <div className="css-flag-stripe-red" />
            </div>
          </div>
        </div>

        {/* Ala Derecha (3 niveles) */}
        <div className="css-building-wing">
          {/* Nivel 3 */}
          <div className="css-window-floor">
            <div className="css-window-pane" />
            <div className="css-window-pane" />
            <div className="css-window-pane" />
          </div>
          {/* Nivel 2 */}
          <div className="css-window-floor">
            <div className="css-window-pane" />
            <div className="css-window-pane" />
            <div className="css-window-pane" />
          </div>
          {/* Nivel 1 */}
          <div className="css-window-floor">
            <div className="css-window-pane" />
            <div className="css-window-pane" />
            <div className="css-window-pane" />
          </div>
        </div>

      </div>

      {/* 3. Explanada / Plaza de Concreto con Cuadrícula y Jardinería */}
      <div className="css-plaza-ground">
        <div className="css-plaza-grid" />
        
        {/* Plancha circular de césped con marca blanca a la izquierda */}
        <div className="css-circle-lawn">
          <div className="css-circle-lawn-inner" />
        </div>

        {/* Jardineras cuadradas */}
        <div className="css-square-planter css-planter-1" />
        <div className="css-square-planter css-planter-2" />
        <div className="css-square-planter css-planter-3" />

        {/* Monumento / pedestal del campus a la derecha */}
        <div className="css-plaza-monument" />

        {/* Figura de estudiante caminando a la entrada */}
        <div className="css-campus-student">
          <div className="css-student-head" />
          <div className="css-student-body" />
          <div className="css-student-legs" />
        </div>
      </div>

      {/* 4. Arbolado y Pinos del Campus */}
      <div className="css-campus-tree css-tree-left">
        <div className="css-tree-left-trunk" />
        <div className="css-tree-left-foliage" />
      </div>

      <div className="css-campus-tree css-tree-center-right">
        <div className="css-tree-cr-trunk" />
        <div className="css-tree-cr-foliage" />
      </div>

      <div className="css-campus-tree css-tree-midground">
        <div className="css-tree-mg-trunk" />
        <div className="css-tree-mg-foliage" />
      </div>

      <div className="css-tree-cypress" />

      {/* 5. Luminarias Cónicas Modernas de Ciudad Universitaria */}
      {/* Luminaria Principal en Primer Plano */}
      <div className="css-lamppost css-lamppost-foreground">
        <div className="css-lantern-head" />
        <div className="css-lantern-pole" />
        <div className="css-lantern-base" />
      </div>

      {/* Luminarias secundarias en perspectiva */}
      <div className="css-lamppost css-lamppost-mid-left">
        <div className="css-lantern-head" />
        <div className="css-lantern-pole" />
      </div>

      <div className="css-lamppost css-lamppost-mid-right">
        <div className="css-lantern-head" />
        <div className="css-lantern-pole" />
      </div>

      <div className="css-lamppost css-lamppost-center">
        <div className="css-lantern-head" />
        <div className="css-lantern-pole" />
      </div>

      {/* 6. Filtro / Overlay de Profundidad */}
      <div className="css-campus-overlay" />

    </div>
  );
}
