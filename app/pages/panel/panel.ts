import {Component, ViewChild, ElementRef, ChangeDetectorRef} from '@angular/core';
import {Platform, Events} from 'ionic-angular';
import {SignalK} from '../signalk/signalk';

declare var steelseries;

@Component({
  templateUrl: 'build/pages/panel/panel.html'
})
export class PanelPage {
  @ViewChild('compass') compassRef: ElementRef;
  @ViewChild('depth') depthRef: ElementRef;
  @ViewChild('wind') windRef: ElementRef;
  @ViewChild('speed') speedRef: ElementRef;
  @ViewChild('windSpeed') windSpeedRef: ElementRef;

  compass: any;
  depth: any;
  wind: any;
  speed: any;
  windSpeed: any;

  constructor(
    platform: Platform,
    public events: Events,
    public ref: ChangeDetectorRef,
    public signalK: SignalK
  ){
    platform.ready().then( () => {
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
   
      /*
      On some platforms, nondeterministically, steelseries may
      take time be ready even after platform.ready() fires and
      causes blank screens. Following 500ms delay is in place
      to make sure it is properly initialized before setting up
      gauges and starting Signal K.
      */
      setTimeout( () => this.setUpGauges(), 500);
      setTimeout( () => signalK.start(), 250);
    });
  }

  setUpGauges() {
      let width = Math.round(window.innerWidth/2)-30;
      let height = Math.round(window.innerHeight/2)-30;

      this.compassRef.nativeElement.width = width; 
      this.compassRef.nativeElement.height = height; 

      this.depthRef.nativeElement.width = width;
      this.depthRef.nativeElement.height = height;

      this.windRef.nativeElement.width = width;
      this.windRef.nativeElement.height = height;

      this.speedRef.nativeElement.width = width;
      this.speedRef.nativeElement.height = height;

      this.windSpeedRef.nativeElement.width = width+10;
      this.windSpeedRef.nativeElement.height = Math.round(width/2);

      // Gaugue designs are from https://github.com/SignalK/simplegauges
      this.compass = new steelseries.Compass('compass', {
        rotateFace: true,
      });

      this.depth = new steelseries.Radial('depth', {
         section: [
           steelseries.Section(0, 4, 'rgba(255, 0, 0, 0.3)'),
           steelseries.Section(4, 8, 'rgba(220, 220, 0, 0.3)')
         ],
         titleString: "Depth",
         unitString: "m",
         lcdVisible: true,
         maxValue: 20,
         maxMeasuredValue: 0,
         maxMeasuredValueVisible: true,
         thresholdVisible: false,
         ledVisible: false,
      });

      this.wind = new steelseries.WindDirection('wind', {
        lcdVisible: true,
        degreeScaleHalf: true,
        pointSymbolsVisible: false,
      });

      this.speed = new steelseries.Radial('speed', {
        titleString: "SOG",
        unitString: "kn",
        lcdVisible: true,
        maxValue: 10,
        maxMeasuredValue: 0,
        maxMeasuredValueVisible: true,
        thresholdVisible: false,
        ledVisible: false,
      });

      this.windSpeed = new steelseries.DisplayMulti('windSpeed', {
        unitString: "kn",
        unitStringVisible: true,
        headerString: "Wind Speed",
        headerStringVisible: true,
        detailString: "True: ",
        detailStringVisible: true,
        linkAltValue: false
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
              case 'environment.depth.belowTransducer':
                this.depth.setValue(value);
                break;
              case 'environment.wind.angleApparent':
                this.wind.setValueAnimatedApparent(value * 180 / Math.PI);
                break;
              case 'environment.wind.angleTrueWater':
                this.wind.setValueAnimatedTrue(value * 180 / Math.PI);
                break;
              case 'environment.wind.angleApparent':
                this.wind.setValue(value);
                break;
              case 'environment.wind.speedApparent':
                this.windSpeed.setValue(value * 1.94384);
                break;
              case 'environment.wind.speedTrue':
                this.windSpeed.setAltValue(value * 1.94384);
                break;
              case 'navigation.courseOverGroundMagnetic':
                this.compass.setValue(value * 180 / Math.PI);
                break;
              case 'navigation.speedOverGround':
                this.speed.setValue(value * 1.94384);
                break;
            }
          }
        } 
      } // vesselId is self
    } // context in data
  }
}
