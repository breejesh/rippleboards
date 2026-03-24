import { Component } from '@angular/core';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedLocation: string = '';
  simulationResults: any = null;
  baselineMetrics: any = null;
  scenarios: any[] = [];

  constructor(private api: ApiService) {}

  onLocationSelect(location: string) {
    this.selectedLocation = location;
    this.simulationResults = null; // Clear previous results
    this.loadBaselineMetrics(location);
  }

  loadBaselineMetrics(location: string) {
    this.api.getMeasures(location).subscribe(
      (data: any) => {
        this.baselineMetrics = data;
      },
      (error) => {
        console.error('Error loading baseline metrics:', error);
      }
    );
  }

  onSimulationComplete(results: any) {
    this.simulationResults = results;
  }

  onScenarioCreated(scenario: any) {
    this.scenarios.push(scenario);
  }
}
