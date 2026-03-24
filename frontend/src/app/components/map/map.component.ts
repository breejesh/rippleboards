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
        this.locations = data;
        this.filteredLocations = data;
        this.states = Array.from(new Set(data.map((l: any) => l.StateDesc))).sort() as string[];
        this.loading = false;
      },
      (error) => {
        console.error('Error loading locations:', error);
        this.loading = false;
      }
    );
  }

  filterLocations() {
    this.filteredLocations = this.locations.filter((loc: any) => {
      const matchesSearch = loc.LocationName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           loc.StateDesc.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesState = !this.stateFilter || loc.StateDesc === this.stateFilter;
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
    this.filteredLocations = this.locations;
  }

  getDisplayCount(): string {
    return `${this.filteredLocations.length} of ${this.locations.length}`;
  }
}
