import { Component, Input, OnChanges, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit, OnChanges {
  @Input() results: any = null;
  @Input() policyStack: any = null;
  @Input() selectedLocation: string = '';
  @Input() interventionValues: { [key: string]: number } = {};
  @Input() currentStateMortality: number = 910;  // Current actual mortality rate for the state

  @ViewChild('trendSVG') trendSVG!: ElementRef;

  // Store the interventions that were actually simulated
  simulatedInterventions: { [key: string]: number } = {};

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

  chartAnimationTrigger: number = 0;  // Trigger for chart re-animation

  confidenceSummary = {
    lower: 0,
    upper: 0
  };

  ngOnInit() {
    this.processResults();
  }

  ngOnChanges() {
    // Only process if simulationResults actually changed (new simulation)
    // Store the interventions that were used for this simulation
    if (this.results) {
      this.simulatedInterventions = { ...this.interventionValues };
      // Trigger chart re-animation on new results
      this.chartAnimationTrigger++;
    } else {
      this.simulatedInterventions = {};
    }
    this.processResults();
    
    // Restart chart line animations  
    if (this.results) {
      setTimeout(() => this.restartChartAnimation(), 100);
    }
  }

  restartChartAnimation() {
    if (!this.trendSVG) return;
    
    const svg = this.trendSVG.nativeElement;
    const lines = svg.querySelectorAll('.line');
    
    lines.forEach((line: any) => {
      // Remove animation
      line.style.animation = 'none';
      // Trigger reflow to restart animation
      void line.offsetWidth;
      // Re-apply animation
      line.style.animation = '';
    });
  }

  processResults() {
    const yearStart = 2026;
    const horizon = 5;
    this.years = Array.from({ length: horizon }, (_, idx) => yearStart + idx);

    // Use current state mortality as the baseline, fallback to 910
    const baselineRate = this.currentStateMortality || 910;
    const reductionPct = this.getMortalityReductionPct();
    const baselineSlope = 5.5;
    const projectedSlope = -Math.abs(reductionPct * 0.8);  // Negative slope - mortality decreases

    this.baselineTrajectory = this.years.map((_, idx) => baselineRate + idx * baselineSlope);

    // Apply mortality reduction as an absolute change so the projected series' first
    // value reflects the immediate post-intervention mortality (matches outer ripple)
    const reductionPctAbs = reductionPct / 100; // e.g. 0.12 for 12%
    const reductionAbsolute = baselineRate * reductionPctAbs;
    this.projectedTrajectory = this.years.map((_, idx) => (baselineRate + idx * projectedSlope) - reductionAbsolute);

    this.confidenceUpper = this.projectedTrajectory.map((value, idx) => value + (24 - idx * 0.9));
    this.confidenceLower = this.projectedTrajectory.map((value, idx) => value - (24 - idx * 0.9));

    this.chartMax = Math.max(...this.baselineTrajectory, ...this.confidenceUpper) + 18;
    this.chartMin = Math.min(...this.projectedTrajectory, ...this.confidenceLower) - 18;

    const finalProjected = this.projectedTrajectory[this.projectedTrajectory.length - 1] || baselineRate;
    this.confidenceSummary = {
      lower: Math.round((this.confidenceLower[this.confidenceLower.length - 1] || finalProjected) - 0),
      upper: Math.round((this.confidenceUpper[this.confidenceUpper.length - 1] || finalProjected) + 0)
    };

    // Only calculate ripple values if we have actual simulation results
    if (this.results) {
      this.roiSavingsPerDollar = this.results?.roi?.savingsPerDollar || Number((1.35 + reductionPct / 12).toFixed(2));
      this.annualSavings = this.results?.roi?.annualSavings || Math.round(2200000 * this.roiSavingsPerDollar);
      this.avoidedERVisits = Math.round((this.results?.ripple?.erVisitDensityDecrease || 6) * 130);
    } else {
      // Reset ripple values when no simulation
      this.roiSavingsPerDollar = 0;
      this.annualSavings = 0;
      this.avoidedERVisits = 0;
    }
  }

  getMortalityReductionPct(): number {
    // Only calculate reduction if we have actual simulation results
    // Otherwise return 0 to show baseline (no intervention effect)
    if (!this.results) {
      return 0;
    }

    // Calculate from simulated intervention values (not from API, to ensure consistency)
    if (!this.simulatedInterventions || Object.keys(this.simulatedInterventions).length === 0) {
      return 0;
    }

    // Calculate from intervention values that were actually used in simulation
    const broadbandImpact = (this.simulatedInterventions['broadband_grant'] || 0) / 100 * 0.08;      
    const housingImpact = (this.simulatedInterventions['housing_subsidy'] || 0) / 100 * 0.12;       
    const educationImpact = (this.simulatedInterventions['education_program'] || 0) / 100 * 0.10;   
    const employmentImpact = (this.simulatedInterventions['employment_initiative'] || 0) / 100 * 0.11; 
    const healthcareImpact = (this.simulatedInterventions['healthcare_access'] || 0) / 100 * 0.15;  

    const totalIndividual = broadbandImpact + housingImpact + educationImpact + employmentImpact + healthcareImpact;
    
    // Count how many interventions are active (threshold > 10%)
    const activeCount = Object.values(this.simulatedInterventions).filter(v => v > 10).length;
    const synergyBonus = (activeCount > 1) ? (activeCount - 1) * 0.04 : 0;

    // Total reduction percentage (capped at 35%)
    const totalReduction = Math.min((totalIndividual + synergyBonus) * 100, 35);
    return totalReduction;
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
        const x = 46 + idx * 131;  // Spacing for 5 years to fill width
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
        const x = 46 + idx * 131;
        const y = this.getY(value);
        return `${idx === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');

    const lower = [...this.confidenceLower]
      .reverse()
      .map((value, idx) => {
        const x = 46 + (this.confidenceLower.length - 1 - idx) * 131;
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

    const reductionPct = this.getMortalityReductionPct();
    
    // Map interventions to ripple impacts
    const broadbandLevel = this.simulatedInterventions?.['broadband_grant'] || 0;
    const housingLevel = this.simulatedInterventions?.['housing_subsidy'] || 0;
    const educationLevel = this.simulatedInterventions?.['education_program'] || 0;
    const employmentLevel = this.simulatedInterventions?.['employment_initiative'] || 0;
    const healthcareLevel = this.simulatedInterventions?.['healthcare_access'] || 0;

    // Primary Ripple (Healthcare Utilization): Broadband, Employment, Healthcare access
    // Secondary Ripple (ER Visit Density): Housing, Healthcare access
    // Outer Ripple (Mortality Reduction): Equal contribution to graph mortality rate

    let primaryRipple = 0;
    let secondaryRipple = 0;
    let outerRipple = 0;

    if (key === 'healthcareUtilizationIncrease') {
      // Primary impacts: Broadband (digital health access)
      primaryRipple = broadbandLevel * 0.12 + employmentLevel * 0.08 + healthcareLevel * 0.15 + reductionPct * 0.5;
      return Math.round(primaryRipple);
    }
    
    if (key === 'erVisitDensityDecrease') {
      // Secondary impacts: Housing (stability leads to better health decisions)
      secondaryRipple = housingLevel * 0.06 + healthcareLevel * 0.08 + reductionPct * 0.35;
      return Math.round(secondaryRipple);
    }
    
    if (key === 'prematureMortalityReductionPer100k') {
      // Outer Ripple: Equal contribution to mortality rate shown in graph
      outerRipple = Math.round(reductionPct);
      return outerRipple;
    }

    return 0;
  }
}

