import {Component, ViewChild, ElementRef, ChangeDetectorRef} from '@angular/core';
import {Platform, Events} from 'ionic-angular';
import {SignalK} from '../signalk/signalk';

declare var steelseries;

@Component({
  templateUrl: 'build/pages/sensors/sensors.html'
})
export class SensorsPage {
  @ViewChild('temperatureC') temperatureCRef: ElementRef;
  @ViewChild('temperatureF') temperatureFRef: ElementRef;
  @ViewChild('pressure') pressureRef: ElementRef;
  @ViewChild('humidity') humidityRef: ElementRef;

  temperatureC: any;
  temperatureF: any;
  pressure: any;
  humidity: any;
  unit: string;

  constructor(
    platform: Platform,
    public events: Events,
    public ref: ChangeDetectorRef,
    public signalK: SignalK
  ){
    this.unit = window.localStorage.getItem('unit') || 'fahrenheit';
    platform.ready().then( () => {
      this.setUpGauges();
      this.events.subscribe('ws:open', () => ref.detectChanges());
      this.events.subscribe('ws:close', () => ref.detectChanges());
      this.events.subscribe('ws:error', () => ref.detectChanges());
      this.events.subscribe('ws:message', (eventData) => {
        /* 
        There is a bug, possibly in WebSocket, that may cause the
        event handler continue receiving messages even after the
        connection is down.

        We ensure connection is up before processing received
        messages.
        */
        if (signalK.connected)
          this.handleSignalKMessage(eventData[0]);
      });
    });
  }

  setUpGauges() {
      let width = Math.round(window.innerWidth/1.5);
      let height = Math.round(window.innerHeight/2)-30;
 
      this.temperatureCRef.nativeElement.width = width; 
      this.temperatureCRef.nativeElement.height = height; 

      this.temperatureFRef.nativeElement.width = width; 
      this.temperatureFRef.nativeElement.height = height; 

      width = Math.round(window.innerWidth/2)-30;
      height = Math.round(window.innerHeight/2)-30;

      this.pressureRef.nativeElement.width = width;
      this.pressureRef.nativeElement.height = height;

      this.humidityRef.nativeElement.width = width;
      this.humidityRef.nativeElement.height = height;

      this.temperatureC = new steelseries.Radial('temperatureC', {
         section: [
           steelseries.Section(-10, 0, 'rgba(240, 248, 255, 0.3)'),
           steelseries.Section(0, 3, 'rgba(116, 187, 251, 0.3)')
         ],
         titleString: "Temperature",
         unitString: "°C",
         lcdVisible: true,
         maxValue: 40,
         minValue: -10,
         maxMeasuredValue: 0,
         maxMeasuredValueVisible: true,
         thresholdVisible: false,
         ledVisible: false,
      });

      this.temperatureF = new steelseries.Radial('temperatureF', {
         section: [
           steelseries.Section(14, 32, 'rgba(240, 248, 255, 0.3)'),
           steelseries.Section(0, 38, 'rgba(116, 187, 251, 0.3)')
         ],
         titleString: "Temperature",
         unitString: "°F",
         lcdVisible: true,
         maxValue: 110,
         minValue: 10,
         maxMeasuredValue: 0,
         maxMeasuredValueVisible: true,
         thresholdVisible: false,
         ledVisible: false,
      });

      this.pressure = new steelseries.Radial('pressure', {
        titleString: "Pressure",
        unitString: "hPa",
        lcdVisible: true,
        maxValue: 2000,
        maxMeasuredValue: 0,
        maxMeasuredValueVisible: true,
        thresholdVisible: false,
        ledVisible: false,
      });

      this.humidity = new steelseries.Radial('humidity', {
        titleString: "Humidity",
        unitString: "%",
        lcdVisible: true,
        maxValue: 100,
        maxMeasuredValue: 0,
        maxMeasuredValueVisible: true,
        thresholdVisible: false,
        ledVisible: false,
      });

  }

  handleSignalKMessage(jsonData) {
    let data = JSON.parse(jsonData);
    if (('name' in data) && (data.name == 'signalk-server'))
      this.signalK.selfId = data.self
    else if ('context' in data) {
      let vesselId = data.context.replace('vessels.','');
      if (vesselId == this.signalK.selfId) {
        for (let i=0;i<data.updates.length;i++) {
          let values=data.updates[i].values;
          for (let j=0;j<values.length;j++) {
            let path=values[j].path;
            let value=values[j].value;
            switch (path) {
              case 'environment.inside.temperature':
                let temperatureC = Math.round(10*value)/10;
                this.temperatureC.setValue(temperatureC);
                let temperatureF = Math.round(10*(value*9/5+32))/10;
                this.temperatureF.setValue(temperatureF);
                break;
              case 'environment.outside.pressure':
                let pressure = Math.round(10*value)/1000;
                this.pressure.setValue(pressure);
                break;
              case 'environment.inside.humidity':
                let humidity = Math.round(value);
                this.humidity.setValue(humidity);
                break;
            }
          }
        } 
      } // vesselId is self
    } // context in data
  }

  saveUnit() {
    window.localStorage.setItem('unit', this.unit);
  }
}
