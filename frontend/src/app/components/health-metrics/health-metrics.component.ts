import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-health-metrics',
  templateUrl: './health-metrics.component.html',
  styleUrls: ['./health-metrics.component.css']
})
export class HealthMetricsComponent implements OnInit {
  @Input() location: string = '';
  @Input() simulationResults: any = null;

  metrics: any[] = [];
  loading: boolean = false;
  selectedTab: string = 'overview';

  constructor(private api: ApiService) {}

  ngOnInit() {
    if (this.location) {
      this.loadMetrics();
    }
  }

  ngOnChanges() {
    if (this.location) {
      this.loadMetrics();
    }
  }

  loadMetrics() {
    this.loading = false;
    // Component not currently used in new layout
  }

  processMetrics(rawData: any[]): any[] {
    if (!rawData || !Array.isArray(rawData)) return [];

    // Group metrics by category
    const grouped: { [key: string]: any[] } = {};
    
    rawData.forEach((item: any) => {
      const category = item.Category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Convert to array format
    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items: items.slice(0, 3) // Limit to top 3 per category
    }));
  }

  getMetricColor(value: number): string {
    if (value > 75) return '#FF5722';
    if (value > 50) return '#FFC107';
    if (value > 25) return '#4CAF50';
    return '#67BB6A';
  }

  getComparisonStatus() {
    if (!this.simulationResults) return null;
    const reduction = this.simulationResults.projected_mortality_reduction * 100;
    return {
      reduction: reduction.toFixed(1),
      status: reduction > 10 ? 'High Impact' : reduction > 5 ? 'Moderate Impact' : 'Low Impact',
      statusColor: reduction > 10 ? '#4CAF50' : reduction > 5 ? '#FFC107' : '#FF5722'
    };
  }
}
