import { Component, OnInit, Output, EventEmitter, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() stateSelected = new EventEmitter<string>();
  @Input() selectedState: string | null = null;

  private map: L.Map | null = null;
  private stateGeoJsonLayer: L.GeoJSON | null = null;
  private stateValueMap: Record<string, number> = {};
  private stateLayerMap: Record<string, L.Layer> = {};
  private simulationMortalityMap: Record<string, number> = {};
  private oldMortalityMap: Record<string, number> = {};  // Track old values for glow effect
  private mortalityChangePopups: Record<string, L.Popup> = {};  // Track popups
  private selectedStateLayer: L.Layer | null = null;
  
  states: any[] = [];
  loading = true;
  currentState: string | null = null;
  simulationResults: any = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Don't load states here - wait for view init
  }

  ngAfterViewInit() {
    // Initialize map first
    this.initMap();
    // Then load states data
    this.loadStates();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap() {
    this.map = L.map('leaflet-map', {
      center: [39.5, -98.35],
      zoom: 4,
      minZoom: 3,
      maxZoom: 12
    });

    // No tile layer - just show the state polygons
    this.renderStateMarkers();
  }

  loadStates() {
    this.loading = true;
    this.api.getStates().subscribe(
      (data: any) => {
        this.states = Array.isArray(data) ? data : [];
        this.loading = false;
        if (this.map) {
          this.renderStateMarkers();
        }
      },
      (error) => {
        console.error('Error loading states:', error);
        this.loading = false;
      }
    );
  }

  animatingStates: Set<string> = new Set();

  colorForValue(v: number) {
    // Mortality rate color scale: light orange (low) -> dark red (high)
    // Using actual mortality rates (starts around 300-600 per 100k)
    if (v === null || v === undefined || isNaN(v)) return '#888888';
    
    if (v < 350) return '#fed7aa';      // Light orange
    if (v < 400) return '#fdba74';      // Orange
    if (v < 450) return '#fb923c';      // Darker orange
    if (v < 500) return '#f97316';      // Orange-red
    if (v < 550) return '#dc2626';      // Dark red
    return '#7a0006';                   // Very dark red
  }

  getStateLabelClass(v: number): string {
    // Return label class for contrast: light text on dark backgrounds, dark text on light
    if (v === null || v === undefined || isNaN(v)) return 'label-dark';
    if (v < 450) return 'label-dark';   // Light yellow/pale colors get dark text
    return 'label-light';                // Dark red colors get light text
  }

  renderStateMarkers() {
    if (!this.map) return;

    // Build a map of state names to mortality values for styling
    this.stateValueMap = {};
    for (const state of this.states) {
      if (state.state) {
        this.stateValueMap[state.state] = Number(state.mortalityRate) || 0;
      }
    }

    // Load US states GeoJSON and style it
    const geojsonUrl = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
    
    fetch(geojsonUrl)
      .then(response => response.json())
      .then((geojson: any) => {
        if (!this.map) return;

        // Remove old layer if exists
        if (this.stateGeoJsonLayer) {
          this.map.removeLayer(this.stateGeoJsonLayer);
        }

        // Filter out Alaska, Hawaii, and Puerto Rico
        const filteredGeojson = {
          ...geojson,
          features: geojson.features.filter((feature: any) => 
            !['Alaska', 'Hawaii', 'Puerto Rico'].includes(feature?.properties?.name)
          )
        };

        this.stateLayerMap = {}; // Reset layer map

        this.stateGeoJsonLayer = L.geoJSON(filteredGeojson, {
          style: (feature) => {
            const stateName = feature?.properties?.name;
            const baseValue = this.stateValueMap[stateName] || 0;
            const simValue = this.simulationMortalityMap[stateName];
            const displayValue = simValue !== undefined ? simValue : baseValue;
            const color = this.colorForValue(displayValue);

            return {
              fillColor: color,
              weight: 1,
              opacity: 1,
              color: '#ffffff',
              fillOpacity: 0.85
            };
          },
          onEachFeature: (feature, layer) => {
            const stateName = feature?.properties?.name;
            const stateData = this.states.find(s => s.state === stateName);
            const baseValue = this.stateValueMap[stateName] || 0;
            const simValue = this.simulationMortalityMap[stateName];
            const displayValue = simValue !== undefined ? simValue : baseValue;

            // Store layer for future updates
            this.stateLayerMap[stateName] = layer;

            const tooltip = `${stateName}<br/>Mortality Rate: ${displayValue.toFixed(0)} per 100k`;
            layer.bindPopup(tooltip);
            layer.bindTooltip(stateName, { sticky: false });

            // Add state name label at centroid
            if (stateData?.lat && stateData?.lng) {
              const labelClass = this.getStateLabelClass(displayValue);
              const labelIcon = L.divIcon({
                html: `<div class="state-label ${labelClass}">${stateName}</div>`,
                iconSize: [60, 30],
                iconAnchor: [30, 15],
                className: 'state-label-icon'
              });
              L.marker([stateData.lat, stateData.lng], { icon: labelIcon, interactive: false }).addTo(this.map!);
            }

            layer.on('click', () => {
              this.currentState = stateName;
              this.stateSelected.emit(stateName);
              
              // Remove previous selection border
              if (this.selectedStateLayer instanceof L.Path) {
                this.selectedStateLayer.setStyle({
                  weight: 1,
                  color: '#ffffff',
                  opacity: 1,
                  fillOpacity: 0.85
                });
              }
              
              // Apply selection border to new state
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 3,
                  color: '#0f7ea2',
                  opacity: 1,
                  fillOpacity: 0.85
                });
              }
              this.selectedStateLayer = layer;
            });

            layer.on('mouseover', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({ weight: 2, opacity: 1, fillOpacity: 1 });
              }
            });

            layer.on('mouseout', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({ weight: 1, opacity: 1, fillOpacity: 0.85 });
              }
            });
          }
        }).addTo(this.map);
        this.addLegend();
      })
      .catch((error: any) => {
        console.error('Error loading GeoJSON:', error);
      });
  }

  addLegend() {
    if (!this.map) return;

    // Remove existing legends to prevent duplicates
    const existingLegends = document.querySelectorAll('.leaflet-control-container .legend');
    existingLegends.forEach(el => el.remove());

    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `
        <div style="background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 11px; line-height: 1.6;">
          <div style="font-weight: 700; margin-bottom: 6px; color: #102331; font-size: 11px;">Mortality (per 100k)</div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 16px; height: 12px; background-color: #fed7aa; border: 1px solid #ddd; margin-right: 6px;"></div>
            <span style="color: #4c5f6d;">&lt; 350</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 16px; height: 12px; background-color: #fdba74; border: 1px solid #ddd; margin-right: 6px;"></div>
            <span style="color: #4c5f6d;">350-400</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 16px; height: 12px; background-color: #fb923c; border: 1px solid #ddd; margin-right: 6px;"></div>
            <span style="color: #4c5f6d;">400-450</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 16px; height: 12px; background-color: #f97316; border: 1px solid #ddd; margin-right: 6px;"></div>
            <span style="color: #4c5f6d;">450-500</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <div style="width: 16px; height: 12px; background-color: #dc2626; border: 1px solid #ddd; margin-right: 6px;"></div>
            <span style="color: #4c5f6d;">500-550</span>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 16px; height: 12px; background-color: #7a0006; border: 1px solid #ddd; margin-right: 6px;"></div>
            <span style="color: #4c5f6d;">&ge; 550</span>
          </div>
        </div>
      `;
      return div;
    };

    legend.addTo(this.map);
  }

  getStateMortality(stateName: string): number {
    return this.stateValueMap[stateName] || 910;
  }

  updateSimulationVisualization(results: any) {
    // Update mortality map with simulation results
    if (results) {
      // Use state_mortality_projections if available, otherwise use baseline
      const projectedMortality = results.state_mortality_projections || {};
      
      // Animate color transitions for all states
      for (const [stateName, layer] of Object.entries(this.stateLayerMap)) {
        if (layer instanceof L.Path) {
          const oldValue = this.stateValueMap[stateName] || 910;
          // Use projected mortality if available, otherwise keep current
          const newValue = projectedMortality[stateName] !== undefined 
            ? projectedMortality[stateName] 
            : oldValue;
          
          const oldColor = this.colorForValue(oldValue);
          const newColor = this.colorForValue(newValue);
          
          // Always update the style with new color
          (layer as any).setStyle({
            fillColor: newColor,
            fillOpacity: 0.85
          });
          
          // Add animation if value changed
          if (newValue !== oldValue) {
            this.animatingStates.add(stateName);
            console.log(`Animating ${stateName}: ${oldValue} → ${newValue}`);
            // Store old mortality for glow effect reference
            this.oldMortalityMap[stateName] = oldValue;
            
            // Apply glow effect using stroke
            (layer as any).setStyle({
              stroke: true,
              color: '#FFD700',
              weight: 4,
              opacity: 0.8
            });
            
            // Animate stroke back to normal after 4 seconds
            const startTime = Date.now();
            const animationDuration = 4000;
            
            const animateStep = () => {
              const elapsed = Date.now() - startTime;
              const progress = (elapsed % animationDuration) / animationDuration;
              
              // Create pulsing effect
              const opacity = 0.3 + (Math.cos(progress * Math.PI * 2) * 0.5 + 0.5) * 0.5;
              const weight = 2 + Math.sin(progress * Math.PI * 2 + Math.PI / 2) * 2;
              
              (layer as any).setStyle({
                stroke: true,
                color: '#FFD700',
                weight: weight,
                opacity: opacity
              });
              
              if (elapsed < animationDuration) {
                requestAnimationFrame(animateStep);
              } else {
                // Reset to original style after animation completes
                (layer as any).setStyle({
                  stroke: true,
                  color: '#ffffff',
                  weight: 1,
                  opacity: 1
                });
              }
            };
            
            requestAnimationFrame(animateStep);
            
            // Add popup showing change
            const bounds = (layer as any).getBounds();
            const center = bounds.getCenter();
            const popup = L.popup()
              .setLatLng(center)
              .setContent(`<div style="text-align: center; font-weight: bold; font-size: 12px;"><span style="color: ${oldColor};">${Math.round(oldValue)}</span> → <span style="color: ${newColor};">${Math.round(newValue)}</span></div>`)
              .openOn(this.map!);
            
            this.mortalityChangePopups[stateName] = popup;
          }
        }
      }
    }
  }
}

