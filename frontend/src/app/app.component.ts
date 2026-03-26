import { Component } from '@angular/core';
import { ApiService } from './services/api.service';
import { ViewChild } from '@angular/core';
import { MapComponent } from './components/map/map.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedState: string | null = null;
  stateMeasures: any[] = [];
  loadingMeasures = false;
  measureValues: number[] = [];
  currentStateMortality: number = 910;  // Current mortality rate for selected state

  // State selection dropdown
  allStates: string[] = [];
  stateSearch: string = '';
  showStateDropdown = false;

  // Intervention sliders - one per intervention
  interventionValues: { [key: string]: number } = {
    'broadband_grant': 0,
    'housing_subsidy': 0,
    'education_program': 0,
    'employment_initiative': 0,
    'healthcare_access': 0
  };

  simulationResults: any = null;
  simulationLoading = false;

  @ViewChild(MapComponent) mapComponent!: MapComponent;

  constructor(private api: ApiService) {
    this.loadAllStates();
  }

  interventions = [
    { 
      id: 'broadband_grant', 
      label: 'Broadband', 
      icon: '📡',
      description: 'Expand broadband access to underserved areas',
      policyMeaning: '0%: No investment | 100%: Fully subsidized access'
    },
    { 
      id: 'housing_subsidy', 
      label: 'Housing', 
      icon: '🏠',
      description: 'Housing affordability and stability programs',
      policyMeaning: '0%: Market rates | 100%: Affordable housing guarantee'
    },
    { 
      id: 'education_program', 
      label: 'Education', 
      icon: '📚',
      description: 'Educational attainment and literacy programs',
      policyMeaning: '0%: Current funding | 100%: Comprehensive literacy initiative'
    },
    { 
      id: 'employment_initiative', 
      label: 'Employment', 
      icon: '💼',
      description: 'Job skills and employment support',
      policyMeaning: '0%: Job matching only | 100%: Full employment guarantee'
    },
    { 
      id: 'healthcare_access', 
      label: 'Healthcare', 
      icon: '⚕️',
      description: 'Access to preventive healthcare services',
      policyMeaning: '0%: Current coverage | 100%: Universal preventive care'
    }
  ];

  loadAllStates() {
    this.api.getStates().subscribe(
      (data: any) => {
        this.allStates = Array.isArray(data) ? data.map((s: any) => typeof s === 'string' ? s : s.name || s.state) : [];
      },
      (error) => {
        console.error('Error loading states:', error);
      }
    );
  }

  get filteredStates(): string[] {
    if (!this.stateSearch) {
      return this.allStates;
    }
    const search = this.stateSearch.toLowerCase();
    return this.allStates.filter(state => state.toLowerCase().includes(search));
  }

  onStateSelected(stateName: string) {
    this.selectedState = stateName;
    this.showStateDropdown = false;
    this.stateSearch = '';
    this.simulationResults = null;
    this.loadingMeasures = true;
    
    // Get current state mortality for the graph
    if (this.mapComponent) {
      this.currentStateMortality = this.mapComponent.getStateMortality(stateName);
    }
    
    // Reset all sliders when a new state is selected
    this.interventionValues = {
      'broadband_grant': 0,
      'housing_subsidy': 0,
      'education_program': 0,
      'employment_initiative': 0,
      'healthcare_access': 0
    };
    
    // Load measures for this state
    this.api.getStateMeasures(stateName).subscribe(
      (data: any) => {
        this.stateMeasures = Array.isArray(data) ? data : [];
        this.measureValues = this.stateMeasures.map(m => m.value);
        this.loadingMeasures = false;
      },
      (error) => {
        console.error('Error loading measures:', error);
        this.loadingMeasures = false;
      }
    );
  }

  onInterventionChange() {
    // Called when intervention value changes
    console.log('Intervention values updated:', this.interventionValues);
  }

  hasActiveIntervention(): boolean {
    return Object.values(this.interventionValues).some(val => val > 0);
  }

  getInterventionSliderGradient(value: number): string {
    if (value <= 0) {
      // All red since no intervention
      return 'linear-gradient(to right, #ef4444 0%, #ef4444 0%, #e5eef5 0%, #e5eef5 100%)';
    }
    // Red to green only up to current value, then gray
    const percent = value;
    return `linear-gradient(to right, #ef4444 0%, #fbbf24 ${percent / 2}%, #10b981 ${percent}%, #d1d5db ${percent}%, #d1d5db 100%)`;
  }

  getInterventionValueColor(value: number): string {
    // Red at 0%, gold at 50%, green at 100%
    const red = [239, 68, 68];     // #ef4444
    const gold = [251, 191, 36];   // #fbbf24
    const green = [16, 185, 129];  // #10b981

    if (value <= 50) {
      // Interpolate red to gold
      const ratio = value / 50;
      const r = Math.round(red[0] + (gold[0] - red[0]) * ratio);
      const g = Math.round(red[1] + (gold[1] - red[1]) * ratio);
      const b = Math.round(red[2] + (gold[2] - red[2]) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Interpolate gold to green
      const ratio = (value - 50) / 50;
      const r = Math.round(gold[0] + (green[0] - gold[0]) * ratio);
      const g = Math.round(gold[1] + (green[1] - gold[1]) * ratio);
      const b = Math.round(gold[2] + (green[2] - gold[2]) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  getMaxMeasure(): number {
    return this.measureValues.length > 0 ? Math.max(...this.measureValues) : 100;
  }

  runSimulation() {
    if (!this.selectedState || !this.hasActiveIntervention()) {
      return;
    }

    this.simulationLoading = true;

    const simulationData = {
      state: this.selectedState,
      interventions: this.interventionValues
    };

    // For now, send to the existing simulate endpoint
    // This will need backend adjustment to handle multiple interventions
    this.api.runSimulation(simulationData).subscribe(
      (data: any) => {
        // Create new object reference to trigger change detection
        this.simulationResults = { ...data };
        this.simulationLoading = false;
        
        // Trigger map component to update visualization
        if (this.mapComponent) {
          this.mapComponent.updateSimulationVisualization(data);
        }
        
        console.log('Simulation results:', data);
      },
      (error) => {
        console.error('Error running simulation:', error);
        this.simulationLoading = false;
      }
    );
  }

  getMeasureColor(value: number, range?: number[]) {
    const values = range || this.measureValues;
    if (values.length === 0) return '#888888';
    
    const max = Math.max(...values);
    const normalized = value / max;
    
    // Green (good) → Yellow (medium) → Red (bad)
    if (normalized < 0.33) {
      return '#28a745'; // Green
    } else if (normalized < 0.66) {
      return '#ffc107'; // Yellow
    } else {
      return '#dc3545'; // Red
    }
  }
}
