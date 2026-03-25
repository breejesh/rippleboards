import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  selectedLocation: string = '';
  simulationResults: any = null;
  activePolicyStack: any = null;
  scenarios: any[] = [];
  isRegionStepOpen = true;
  isPolicyStepOpen = false;

  onLocationSelect(location: string) {
    this.selectedLocation = location;
    this.simulationResults = null;
    this.isRegionStepOpen = false;
    this.isPolicyStepOpen = true;
  }

  onSimulationComplete(results: any) {
    this.simulationResults = results;
    if (results?.policyStack) {
      this.activePolicyStack = results.policyStack;
    }
  }

  onScenarioCreated(scenario: any) {
    this.scenarios.push(scenario);
  }

  onPolicyStackChange(policyStack: any) {
    this.activePolicyStack = policyStack;
  }

  toggleStep(step: 'region' | 'policy') {
    if (step === 'region') {
      const willOpen = !this.isRegionStepOpen;
      this.isRegionStepOpen = willOpen;
      this.isPolicyStepOpen = !willOpen ? this.isPolicyStepOpen : false;
      return;
    }

    const willOpen = !this.isPolicyStepOpen;
    this.isPolicyStepOpen = willOpen;
    this.isRegionStepOpen = !willOpen ? this.isRegionStepOpen : false;
  }

  goToNextStep() {
    if (this.isRegionStepOpen) {
      if (!this.selectedLocation) {
        return;
      }
      this.isRegionStepOpen = false;
      this.isPolicyStepOpen = true;
      return;
    }

    if (!this.isPolicyStepOpen) {
      this.isPolicyStepOpen = true;
      this.isRegionStepOpen = false;
    }
  }

  canGoNext(): boolean {
    if (this.isRegionStepOpen) {
      return !!this.selectedLocation;
    }

    return true;
  }

  getNextButtonLabel(): string {
    if (this.isRegionStepOpen) {
      return 'Next: Configure Policy';
    }

    return 'Next: Review and Run';
  }

  getRegionSelectionSummary(): string {
    return this.selectedLocation || 'No geography selected yet';
  }

  getPolicySelectionSummary(): string {
    if (!this.activePolicyStack) {
      return 'No policy stack configured yet';
    }

    const selections: string[] = [
      `${this.activePolicyStack.medicationSubsidyPct}% subsidy`
    ];

    if (this.activePolicyStack.housingVouchers) {
      selections.push('housing vouchers');
    }
    if (this.activePolicyStack.newTransitLine) {
      selections.push('transit line');
    }
    if (this.activePolicyStack.fiberExpansion) {
      selections.push('fiber expansion');
    }

    return selections.join(' + ');
  }

  getStructuralMechanism(): string {
    if (!this.activePolicyStack) {
      return 'Reduced financial stress';
    }

    if (this.activePolicyStack.housingVouchers) {
      return 'Housing stability and reduced financial stress';
    }

    if (this.activePolicyStack.newTransitLine) {
      return 'Lower transportation barriers to care';
    }

    if (this.activePolicyStack.fiberExpansion) {
      return 'Digital access and telehealth reach';
    }

    return 'Reduced financial stress from lower medication burden';
  }

  getPolicyActionLabel(): string {
    if (!this.activePolicyStack) {
      return 'Medication Subsidy + Infrastructure Stack';
    }

    const actions: string[] = [
      `${this.activePolicyStack.medicationSubsidyPct}% Medication Subsidy`
    ];

    if (this.activePolicyStack.housingVouchers) {
      actions.push('Housing Vouchers');
    }
    if (this.activePolicyStack.newTransitLine) {
      actions.push('New Transit Line');
    }
    if (this.activePolicyStack.fiberExpansion) {
      actions.push('Community Fiber Expansion');
    }

    return actions.join(' + ');
  }
}
