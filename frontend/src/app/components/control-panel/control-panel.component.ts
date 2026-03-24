import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../services/api.service';

interface Intervention {
  id: string;
  name: string;
  icon: string;
  description: string;
  expectedImpact: string;
}

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent implements OnChanges {
  @Input() selectedLocation: string = '';
  @Output() simulationResults = new EventEmitter<any>();
  @Output() scenarioCreated = new EventEmitter<any>();

  interventions: Intervention[] = [
    {
      id: 'broadband_grant',
      name: 'Broadband Grant',
      icon: '🌐',
      description: 'Expand high-speed internet access to underserved areas',
      expectedImpact: '5-15% mortality reduction through telehealth enablement'
    },
    {
      id: 'housing_subsidy',
      name: 'Housing Subsidy',
      icon: '🏠',
      description: 'Reduce housing cost burden for low-income residents',
      expectedImpact: '8-20% improvement in health outcomes'
    },
    {
      id: 'healthcare_access',
      name: 'Healthcare Access',
      icon: '🏥',
      description: 'Increase primary care and preventive services',
      expectedImpact: '10-25% reduction in preventable mortality'
    }
  ];

  selectedIntervention: Intervention | null = null;
  intensity: number = 0.5;
  loading: boolean = false;
  scenarios: any[] = [];
  showAdvanced: boolean = false;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedLocation'] && changes['selectedLocation'].currentValue) {
      this.selectedIntervention = null;
      this.intensity = 0.5;
    }
  }

  selectIntervention(intervention: Intervention) {
    this.selectedIntervention = intervention;
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
  }

  runSimulation() {
    if (!this.selectedLocation || !this.selectedIntervention) {
      return;
    }

    this.loading = true;
    
    this.api.simulate(
      this.selectedLocation,
      this.selectedIntervention.id,
      this.intensity
    ).subscribe(
      (data: any) => {
        this.simulationResults.emit(data);
        const scenario = {
          id: Date.now(),
          location: this.selectedLocation,
          intervention: this.selectedIntervention,
          intensity: this.intensity,
          results: data,
          timestamp: new Date()
        };
        this.scenarios.push(scenario);
        this.scenarioCreated.emit(scenario);
        this.loading = false;
      },
      (error) => {
        console.error('Simulation error:', error);
        this.loading = false;
      }
    );
  }

  getIntensityLabel(): string {
    if (this.intensity <= 0.3) return 'Minimal';
    if (this.intensity <= 0.6) return 'Moderate';
    if (this.intensity <= 0.85) return 'Substantial';
    return 'Maximum';
  }

  canRunSimulation(): boolean {
    return !!this.selectedLocation && !!this.selectedIntervention && !this.loading;
  }
}

