import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.css']
})
export class ControlPanelComponent implements OnChanges {
  @Input() selectedLocation: string = '';
  @Output() simulationResults = new EventEmitter<any>();
  @Output() scenarioCreated = new EventEmitter<any>();
  @Output() policyStackChanged = new EventEmitter<any>();

  medicationSubsidyPct: number = 70;
  housingVouchers: boolean = false;
  newTransitLine: boolean = false;
  fiberExpansion: boolean = false;

  loading: boolean = false;
  scenarios: any[] = [];

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedLocation'] && changes['selectedLocation'].currentValue) {
      this.emitPolicyStack();
    }
  }

  emitPolicyStack() {
    this.policyStackChanged.emit(this.getPolicyStack());
  }

  getPolicyStack() {
    return {
      medicationSubsidyPct: this.medicationSubsidyPct,
      housingVouchers: this.housingVouchers,
      newTransitLine: this.newTransitLine,
      fiberExpansion: this.fiberExpansion
    };
  }

  getStackCount(): number {
    return [this.housingVouchers, this.newTransitLine, this.fiberExpansion].filter(Boolean).length + 1;
  }

  getStackIntensity(): number {
    const socialDigitalBoost =
      (this.housingVouchers ? 0.12 : 0) +
      (this.newTransitLine ? 0.1 : 0) +
      (this.fiberExpansion ? 0.11 : 0);

    const clinicalBoost = (this.medicationSubsidyPct / 100) * 0.52;
    return Math.min(1, 0.25 + socialDigitalBoost + clinicalBoost);
  }

  getPrimaryInterventionCode(): string {
    if (this.housingVouchers || this.newTransitLine || this.fiberExpansion) {
      return 'stacked_policy_bundle';
    }
    return 'medication_subsidy';
  }

  runSimulation() {
    if (!this.selectedLocation) {
      return;
    }

    this.loading = true;
    this.emitPolicyStack();
    const intensity = this.getStackIntensity();
    
    this.api.simulate(
      this.selectedLocation,
      this.getPrimaryInterventionCode(),
      intensity
    ).subscribe(
      (data: any) => {
        const projectedReductionPct = (data?.projected_mortality_reduction || 0) * 100;
        const ripplePayload = {
          healthcareUtilizationIncrease: Math.round(9 + this.medicationSubsidyPct * 0.24 + this.getStackCount() * 2.8),
          erVisitDensityDecrease: Math.round(4 + projectedReductionPct * 0.6),
          prematureMortalityReductionPer100k: Math.round(910 * (projectedReductionPct / 100))
        };

        const roiMultiplier = 1.4 + (projectedReductionPct / 14);
        const scenarioResults = {
          ...data,
          intensity,
          policyStack: this.getPolicyStack(),
          ripple: ripplePayload,
          roi: {
            savingsPerDollar: Number(roiMultiplier.toFixed(2)),
            annualSavings: Math.round(2500000 * roiMultiplier)
          }
        };

        this.simulationResults.emit(scenarioResults);

        const scenario = {
          id: Date.now(),
          location: this.selectedLocation,
          intervention: this.getPrimaryInterventionCode(),
          intensity,
          policyStack: this.getPolicyStack(),
          results: scenarioResults,
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
    const intensity = this.getStackIntensity();
    if (intensity <= 0.35) return 'Low';
    if (intensity <= 0.65) return 'Moderate';
    if (intensity <= 0.85) return 'High';
    return 'Transformative';
  }

  canRunSimulation(): boolean {
    return !!this.selectedLocation && !this.loading;
  }
}

