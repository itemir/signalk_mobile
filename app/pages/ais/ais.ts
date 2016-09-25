import {Component, ViewChild, ElementRef} from '@angular/core';
import {Platform, Events} from 'ionic-angular';
import {SignalK} from '../signalk/signalk';

declare var google;

@Component({
  templateUrl: 'build/pages/ais/ais.html'
})
export class AISPage {
  @ViewChild('map') mapElement: ElementRef;
  map: any;
  vessel: any = {};
  
  constructor(
    platform: Platform,
    public events: Events,
    public signalK: SignalK
  ) {
    platform.ready().then( () => {
      this.initMap();

      this.map.addListener('zoom_changed', () => {
        for (let vesselId in this.vessel) {
          let heading=this.vessel[vesselId].vessel.navigation.headingTrue;
          if (this.vessel[vesselId].marker != null)
            this.vessel[vesselId].marker.setIcon(this.getIcon(heading));
        }
      });

      setInterval( () => {
        this.cleanMarkers();
      }, 1000);

      events.subscribe('ws:message', (eventData) => { 
        // This is because of a seeming WebSocket bug
        // onMessage may be called even when connection is down
        //if (signalK.connected)
          this.handleSignalKMessage(eventData[0]); 
      });
    });
  }

  handleSignalKMessage(message) {
    let data = JSON.parse(message);
    if ('context' in data) {
      let vesselId = data.context.replace('vessels.','');
      if (vesselId in this.vessel) {
        // Update lastUpdated timestamp, will be cleared if 30 min inactive
        this.vessel[vesselId].lastUpdated = new Date().getTime();
      } else {
        // Initialize vessel
        let vessel: skVessel = {
          mmsi: null,
          name: null,
          navigation: {
            position: {
              timestamp: null,
              altitude: null,
              latitude: null,
              longitude: null,
            },
            state: null,
            speedOverGround: null,
            headingTrue: null,
            courseOverGroundTrue: null
          },
          communication: {
            callSignVhf: null
          }
        }
        this.vessel[vesselId]={
          lastUpdated: new Date().getTime(),
          vessel: vessel,
          marker: null,
          trace: []
        }
      }
      for (let i=0;i<data.updates.length;i++) {
        let values=data.updates[i].values;
        for (let j=0;j<values.length;j++) {
          let path=values[j].path;
          let value=values[j].value;

          let positionChanged = false;
          switch (path) {
            case 'name':
              this.vessel[vesselId].vessel.name=value;
              break;
            case 'navigation.position':
              this.vessel[vesselId].vessel.navigation.position.longitude=value.longitude;
              this.vessel[vesselId].vessel.navigation.position.latitude=value.latitude;
              positionChanged = true;
              break;
            case 'navigation.position.longitude':
              this.vessel[vesselId].vessel.navigation.position.longitude=value;
              positionChanged = true;
              break;
            case 'navigation.position.latitude':
              this.vessel[vesselId].vessel.navigation.position.latitude=value;
              positionChanged = true;
              break;
            case 'navigation.headingTrue':
             this.vessel[vesselId].vessel.navigation.headingTrue=value;
             if (this.vessel[vesselId].marker != null)
               this.vessel[vesselId].marker.setIcon(this.getIcon(value)); 
             break;
          }
          let lat = this.vessel[vesselId].vessel.navigation.position.latitude;
          let lng = this.vessel[vesselId].vessel.navigation.position.longitude;
          let heading = this.vessel[vesselId].vessel.navigation.headingTrue;

          if ((this.vessel[vesselId].marker == null) && lat && lng){
            this.vessel[vesselId].marker = this.addMarker(lat, lng, heading);
            // If this is the only/first vessel, center on it
            if (Object.keys(this.vessel).length == 1) {
              let centerLatLng = new google.maps.LatLng(lat, lng);
              this.map.setCenter(centerLatLng);
            }
          }
          else if (positionChanged && lat && lng ) {
            // Add trail in old position
            // Disabled for now as it slows down when there are many vessels around
            /*
            let position = this.vessel[vesselId].marker.getPosition();
            let traceMarker = new google.maps.Marker({
              position: {
                lat: position.lat(),
                lng: position.lng()
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: 'green',
                fillOpacity: 0.3,
                strokeColor: 'green',
                strokeWeight: 1,
                strokeOpacity: 0.3,
                scale: 1
              },
              map: this.map,
            });
            this.vessel[vesselId].trace.push({
              created: new Date().getTime(),
              marker: traceMarker
            });
            */
            let newLatLng = new google.maps.LatLng(lat, lng);
            this.vessel[vesselId].marker.setPosition(newLatLng);
          }
          
        }
      }
    } // 'context' is available within data structure
  }

  initMap () {
    let latLng = new google.maps.LatLng(37.81084667, -122.32957667);

    let mapOptions = {
      center: latLng,
      zoom: 11,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  addMarker(latitude: number, longitude: number, bearing: number=null) {
    let marker = new google.maps.Marker({
      position: {
        lat: latitude,
        lng: longitude
      },
      icon: this.getIcon(bearing),
      map: this.map,
    });
    return marker;
  }

  getIcon(rotation=null, color='green') {
    let zoom=this.map.getZoom();
    let scale = zoom-8;
    if (scale < 1) scale=1;
    let path: string;
    if (rotation == null) {
      path='CIRCLE';
      scale = scale + 1;
    } 
    else {
      rotation = rotation * 180 / Math.PI;
      if (rotation > 360) {
        rotation = null;
        path='CIRCLE';
        scale = scale + 1;
      }
      else {
        path='FORWARD_CLOSED_ARROW';
      }
    }
    let icon = {
      path: google.maps.SymbolPath[path],
      strokeColor: color,
      strokeWeight: 1,
      fillColor: color,
      fillOpacity: 0.3,
      scale: scale
    }
    if (rotation != null)
      icon['rotation'] = rotation;
    return icon;
  }

  // Clean markers older than 15 minutes
  // Clean trace markers older than 5 minutes
  cleanMarkers() {
    let now = new Date().getTime();
    for (let vesselId in this.vessel) {
      let trace = this.vessel[vesselId].trace;
      for (let i=0;i < trace.length;i++) {
        let created = trace[i].created;
        if (now - created > 5*60*1000) {
          this.vessel[vesselId].trace[i].marker.setMap(null);
          this.vessel[vesselId].trace.splice(i, 1);
        }
      }

      let lastUpdated = this.vessel[vesselId].lastUpdated;
      if (now - lastUpdated > 10*60*1000) {
        if (this.vessel[vesselId].marker != null)
          this.vessel[vesselId].marker.setMap(null);
          delete this.vessel[vesselId];
      }
    }
  }
}
