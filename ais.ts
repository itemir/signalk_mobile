import {Component, ViewChild, ElementRef} from '@angular/core';
import {NavController, Platform} from 'ionic-angular';
import {Http} from "@angular/http";
import {$WebSocket} from 'angular2-websocket/angular2-websocket'

declare var google;

@Component({
  templateUrl: 'build/pages/ais/ais.html'
})
export class AISPage {
  @ViewChild('map') mapElement: ElementRef;
  map: any;
  vessel: any = {};
  
  constructor(
    platform: Platform
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

      let ws = new $WebSocket("ws://192.168.1.2:3000/signalk/v1/stream?subscribe=all&stream=delta");
      ws.connect();
      ws.onMessage( (message) => {
        let data = JSON.parse(message.data);
        if ('context' in data) {
          let vesselId = data.context.replace('vessels.','');
          if (vesselId in this.vessel) {
            // Update lastUpdated timestamp, will be cleared if 15 min inactive
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
              marker: null
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
              if ((this.vessel[vesselId].marker == null) &&
                  (this.vessel[vesselId].vessel.navigation.position.longitude) &&
                  (this.vessel[vesselId].vessel.navigation.position.latitude))
                this.vessel[vesselId].marker = this.addMarker(this.vessel[vesselId].vessel.navigation.position.latitude,
                                               this.vessel[vesselId].vessel.navigation.position.longitude,
                                               this.vessel[vesselId].vessel.navigation.headingTrue)
              else if ((positionChanged) &&
                       (this.vessel[vesselId].vessel.navigation.position.longitude) &&
                       (this.vessel[vesselId].vessel.navigation.position.latitude)) {
                let newLatLng = new google.maps.LatLng(this.vessel[vesselId].vessel.navigation.position.latitude,
                                                       this.vessel[vesselId].vessel.navigation.position.longitude);
                this.vessel[vesselId].marker.setPosition(newLatLng);
              }
              
            }
          }
        } // 'context' is available within data structure
      }, {filter: '*', autoApply: false});
    });
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

  // Clean markers that are older than 15 minutes
  cleanMarkers() {
    let now = new Date().getTime();
    for (let vesselId in this.vessel) {
      let lastUpdated = this.vessel[vesselId].lastUpdated;
      if (now - lastUpdated > 15*60*1000) {
        if (this.vessel[vesselId].marker != null)
          this.vessel[vesselId].marker.setMap(null);
          delete this.vessel[vesselId];
      }
    }
  }
}
