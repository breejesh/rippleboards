import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  @Output() locationSelected = new EventEmitter<string>();

  locations: any[] = [];
  filteredLocations: any[] = [];
  selectedLocation: string | null = null;
  searchQuery: string = '';
  stateFilter: string = '';
  states: string[] = [];
  loading: boolean = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadLocations();
  }

  loadLocations() {
    this.api.getLocations().subscribe(
      (data: any) => {
        this.locations = Array.isArray(data) ? data : [];
        this.filteredLocations = [...this.locations];
        this.states = Array.from(
          new Set(this.locations.map((l: any) => l?.StateDesc).filter((state: any) => !!state))
        ).sort() as string[];
        this.loading = false;
      },
      (error) => {
        console.error('Error loading locations:', error);
        this.loading = false;
      }
    );
  }

  getZipFromLocation(loc: any): string {
    const locationName = (loc?.LocationName || '').toString();
    const geoValue = (loc?.Geolocation || '').toString();

    const locationZipMatch = locationName.match(/\b\d{5}(?:-\d{4})?\b/);
    if (locationZipMatch) {
      return locationZipMatch[0].slice(0, 5);
    }

    const geoZipMatch = geoValue.match(/\b\d{5}(?:-\d{4})?\b/);
    if (geoZipMatch) {
      return geoZipMatch[0].slice(0, 5);
    }

    return '';
  }

  filterLocations() {
    const normalizedSearch = this.searchQuery.trim().toLowerCase();

    this.filteredLocations = this.locations.filter((loc: any) => {
      const locationName = (loc?.LocationName || '').toString().toLowerCase();
      const stateName = (loc?.StateDesc || '').toString().toLowerCase();
      const zip = this.getZipFromLocation(loc);

      const matchesSearch = !normalizedSearch ||
        locationName.includes(normalizedSearch) ||
        stateName.includes(normalizedSearch) ||
        zip.includes(normalizedSearch);

      const matchesState = !this.stateFilter || loc?.StateDesc === this.stateFilter;

      return matchesSearch && matchesState;
    });

  }

  onSearchChange() {
    this.filterLocations();
  }

  onStateChange() {
    this.filterLocations();
  }

  onStateClick(state: string) {
    if (this.stateFilter === state) {
      this.stateFilter = '';
    } else {
      this.stateFilter = state;
    }
    this.filterLocations();
  }

  selectLocation(location: string) {
    this.selectedLocation = location;
    this.locationSelected.emit(location);
  }

  clearFilters() {
    this.searchQuery = '';
    this.stateFilter = '';
    this.filteredLocations = [...this.locations];
  }

  getVisibleLocations(): any[] {
    return this.filteredLocations;
  }

  getDisplayCount(): string {
    return `${this.filteredLocations.length} of ${this.locations.length}`;
  }
}
