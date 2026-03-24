import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MapComponent } from './components/map/map.component';
import { ControlPanelComponent } from './components/control-panel/control-panel.component';
import { ResultsComponent } from './components/results/results.component';
import { HealthMetricsComponent } from './components/health-metrics/health-metrics.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    ControlPanelComponent,
    ResultsComponent,
    HealthMetricsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
