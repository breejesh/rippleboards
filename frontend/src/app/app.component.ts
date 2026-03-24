import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedLocation: string = '';
  simulationResults: any = null;

  onLocationSelect(location: string) {
    this.selectedLocation = location;
  }

  onSimulationComplete(results: any) {
    this.simulationResults = results;
  }
}
