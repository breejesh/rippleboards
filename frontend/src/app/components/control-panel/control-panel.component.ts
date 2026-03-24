import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent {
  @Input() selectedLocation: string = '';
  @Output() simulationResults = new EventEmitter<any>();

  intervention: string = 'broadband_grant';
  intensity: number = 0.5;
  loading: boolean = false;
  measures: any[] = [];

  constructor(private api: ApiService) {}

  runSimulation() {
    if (!this.selectedLocation) {
      alert('Please select a location first');
      return;
    }

    this.loading = true;
    this.api.simulate(this.selectedLocation, this.intervention, this.intensity).subscribe(
      (data: any) => {
        this.simulationResults.emit(data);
        this.loading = false;
      },
      (error) => {
        console.error('Error:', error);
        this.loading = false;
      }
    );
  }
}
