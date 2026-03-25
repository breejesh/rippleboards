import { Component, Input, OnChanges, OnInit } from '@angular/core';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit, OnChanges {
  @Input() results: any = null;
  @Input() policyStack: any = null;
  @Input() selectedLocation: string = '';

  years: number[] = [];
  baselineTrajectory: number[] = [];
  projectedTrajectory: number[] = [];
  confidenceUpper: number[] = [];
  confidenceLower: number[] = [];

  chartMax: number = 980;
  chartMin: number = 760;

  roiSavingsPerDollar: number = 0;
  annualSavings: number = 0;
  avoidedERVisits: number = 0;

  confidenceSummary = {
    lower: 0,
    upper: 0
  };

  ngOnInit() {
    this.processResults();
  }

  ngOnChanges() {
    this.processResults();
  }

  processResults() {
    const yearStart = 2026;
    const horizon = 10;
    this.years = Array.from({ length: horizon }, (_, idx) => yearStart + idx);

    const baselineRate = 910;
    const reductionPct = this.getMortalityReductionPct();
    const baselineSlope = 5.5;
    const projectedSlope = baselineSlope - reductionPct * 0.86;

    this.baselineTrajectory = this.years.map((_, idx) => baselineRate + idx * baselineSlope);
    this.projectedTrajectory = this.years.map((_, idx) => baselineRate + idx * projectedSlope);

    this.confidenceUpper = this.projectedTrajectory.map((value, idx) => value + (24 - idx * 0.9));
    this.confidenceLower = this.projectedTrajectory.map((value, idx) => value - (24 - idx * 0.9));

    this.chartMax = Math.max(...this.baselineTrajectory, ...this.confidenceUpper) + 18;
    this.chartMin = Math.min(...this.projectedTrajectory, ...this.confidenceLower) - 18;

    const finalProjected = this.projectedTrajectory[this.projectedTrajectory.length - 1] || baselineRate;
    this.confidenceSummary = {
      lower: Math.round((this.confidenceLower[this.confidenceLower.length - 1] || finalProjected) - 0),
      upper: Math.round((this.confidenceUpper[this.confidenceUpper.length - 1] || finalProjected) + 0)
    };

    this.roiSavingsPerDollar = this.results?.roi?.savingsPerDollar || Number((1.35 + reductionPct / 12).toFixed(2));
    this.annualSavings = this.results?.roi?.annualSavings || Math.round(2200000 * this.roiSavingsPerDollar);
    this.avoidedERVisits = Math.round((this.results?.ripple?.erVisitDensityDecrease || 6) * 130);
  }

  getMortalityReductionPct(): number {
    return ((this.results?.projected_mortality_reduction || 0) * 100);
  }

  getY(value: number): number {
    const chartHeight = 240;
    const usable = this.chartMax - this.chartMin || 1;
    const scaled = ((value - this.chartMin) / usable) * chartHeight;
    return 270 - scaled;
  }

  getLinePath(values: number[]): string {
    return values
      .map((value, idx) => {
        const x = 46 + idx * 58;
        const y = this.getY(value);
        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');
  }

  getConfidenceAreaPath(): string {
    if (!this.confidenceUpper.length || !this.confidenceLower.length) {
      return '';
    }

    const upper = this.confidenceUpper
      .map((value, idx) => {
        const x = 46 + idx * 58;
        const y = this.getY(value);
        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');

    const lower = [...this.confidenceLower]
      .reverse()
      .map((value, idx) => {
        const x = 46 + (this.confidenceLower.length - 1 - idx) * 58;
        const y = this.getY(value);
        return `L ${x},${y}`;
      })
      .join(' ');

    return `${upper} ${lower} Z`;
  }

  getPolicySummary(): string {
    if (!this.policyStack) {
      return 'Activate policy controls to define a simulation stack.';
    }

    const actions = [`${this.policyStack.medicationSubsidyPct}% medication subsidy`];
    if (this.policyStack.housingVouchers) {
      actions.push('housing vouchers');
    }
    if (this.policyStack.newTransitLine) {
      actions.push('new transit line');
    }
    if (this.policyStack.fiberExpansion) {
      actions.push('community fiber expansion');
    }
    return actions.join(' + ');
  }

  getRippleMetric(key: 'healthcareUtilizationIncrease' | 'erVisitDensityDecrease' | 'prematureMortalityReductionPer100k'): number {
    if (!this.results) {
      return 0;
    }

    if (this.results?.ripple?.[key] !== undefined) {
      return this.results.ripple[key];
    }

    const reductionPct = this.getMortalityReductionPct();
    if (key === 'healthcareUtilizationIncrease') {
      return Math.round(8 + reductionPct * 1.2);
    }
    if (key === 'erVisitDensityDecrease') {
      return Math.round(3 + reductionPct * 0.65);
    }
    return Math.round(910 * (reductionPct / 100));
  }
}

