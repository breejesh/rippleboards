import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent {
  @Input() results: any = null;

  getMortalityChangeColor(): string {
    if (!this.results) return '#999';
    const reduction = this.results.projected_mortality_reduction * 100;
    if (reduction > 10) return '#4CAF50';
    if (reduction > 5) return '#FFC107';
    return '#FF5722';
  }
}
