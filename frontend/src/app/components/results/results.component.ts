import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
  @Input() results: any = null;
  @Input() baseline: any = null;

  selectedMetric: string = 'mortality';
  metrics: any[] = [];

  ngOnInit() {
    if (this.results) {
      this.processResults();
    }
  }

  ngOnChanges() {
    if (this.results) {
      this.processResults();
    }
  }

  processResults() {
    this.metrics = [
      {
        label: 'Projected Mortality Reduction',
        value: ((this.results.projected_mortality_reduction || 0) * 100).toFixed(1),
        unit: '%',
        color: this.getMortalityColor(),
        icon: '📊'
      },
      {
        label: 'Priority Score',
        value: ((this.results.priority_score || 0) / 100).toFixed(2),
        unit: '/1.0',
        color: this.getPriorityColor(),
        icon: '⭐'
      }
    ];
  }

  getMortalityColor(): string {
    if (!this.results) return '#999';
    const reduction = this.results.projected_mortality_reduction * 100;
    if (reduction > 10) return '#4CAF50';
    if (reduction > 5) return '#FFC107';
    return '#FF5722';
  }

  getPriorityColor(): string {
    if (!this.results) return '#999';
    const score = this.results.priority_score;
    if (score > 75) return '#4CAF50';
    if (score > 50) return '#FFC107';
    return '#FF5722';
  }

  getImpactLevel(): string {
    const reduction = this.results.projected_mortality_reduction * 100;
    if (reduction > 10) return 'High Impact';
    if (reduction > 5) return 'Moderate Impact';
    return 'Low Impact';
  }

  shareResults() {
    // TODO: Implement sharing functionality
    console.log('Share scenario:', this.results);
  }

  exportReport() {
    // TODO: Implement export functionality
    console.log('Export report for:', this.results);
  }
}

