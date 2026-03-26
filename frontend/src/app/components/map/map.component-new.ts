import { Component, OnInit, Output, EventEmitter, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../services/api.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Output() stateSelected = new EventEmitter<string>();
  @Input() selectedState: string | null = null;

  private map: L.Map | null = null;
  private stateGeoJsonLayer: L.GeoJSON | null = null;
  private stateValueMap: Record<string, number> = {};
  
  states: any[] = [];
  loading = true;
  currentState: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadStates();
  }

  ngAfterViewInit() {
    this.initMap();
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

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

  colorForValue(v: number) {
    // Mortality rate color scale: green (low) -> red (high)
    // Using actual mortality rates (starts around 300-600)
    if (v === null || v === undefined || isNaN(v)) return '#888888';
    
    if (v < 350) return '#38b000';      // Green
    if (v < 400) return '#70d000';      // Light green
    if (v < 450) return '#ffd166';      // Yellow
    if (v < 500) return '#f77f00';      // Orange
    if (v < 550) return '#d62828';      // Red
    return '#7a0006';                   // Dark red
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

        this.stateGeoJsonLayer = L.geoJSON(geojson, {
          style: (feature) => {
            const stateName = feature?.properties?.name;
            const value = this.stateValueMap[stateName] || 0;
            const color = this.colorForValue(value);

            return {
              fillColor: color,
              weight: 2,
              opacity: 1,
              color: '#333',
              fillOpacity: 0.7
            };
          },
          onEachFeature: (feature, layer) => {
            const stateName = feature?.properties?.name;
            const stateData = this.states.find(s => s.state === stateName);
            const value = this.stateValueMap[stateName] || 0;

            const tooltip = `${stateName}<br/>Mortality Rate: ${value.toFixed(0)} per 100k<br/>Locations: ${stateData?.locationCount || 0}`;
            layer.bindPopup(tooltip);
            layer.bindTooltip(stateName, { sticky: false });

            layer.on('click', () => {
              this.currentState = stateName;
              this.stateSelected.emit(stateName);
            });

            layer.on('mouseover', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({ weight: 3, opacity: 1 });
              }
            });

            layer.on('mouseout', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({ weight: 2, opacity: 1 });
              }
            });
          }
        }).addTo(this.map);
      })
      .catch(error => {
        console.error('Error loading GeoJSON:', error);
      });
  }
}
