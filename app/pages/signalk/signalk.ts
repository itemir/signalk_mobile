import {Injectable} from '@angular/core';
import {NavController, LoadingController, AlertController, Events} from 'ionic-angular';
import {$WebSocket} from 'angular2-websocket/angular2-websocket';
import {ServerFormPage} from '../serverform/serverform';

declare var cordova;

@Injectable()
export class SignalK {
  connected: boolean = false;
  selfId: string;
  private ws: any = null;
  private timeout: any;

  constructor(
    public events: Events,
    public alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    public navCtrl: NavController
  ){
    this.events.subscribe('signalk:connect', (eventData) => {
      this.setServerAddress(eventData[0], eventData[1]);
    });
  }

  start(successCallback: Function=null) {
    let loading = this.loadingCtrl.create({
      content: 'Looking for a Signal K Server'
    });
    loading.present().then( () => {
      // Others can signal us to change the server we are using
      /*
      We will look for a Signal K Server mDNS advertisement for 4 
      seconds, then ask the user to enter server address manually.

      If mDNS response is received, this timeout will be canceled.
      */
      let timeout = setTimeout( () => {
        loading.dismiss().then( () => {
          cordova.plugins.zeroconf.unwatch("_signalk-ws._tcp.local.");
          window.localStorage.removeItem('signalkServer');
          window.localStorage.removeItem('signalkServerPath');
          this.obtainServerAddrManually();
        });
      }, 4000);

      cordova.plugins.zeroconf.watch("_signalk-ws._tcp.local.", (result) => {
        loading.dismiss().then( () => {
          for (let i=0;i<result.service.addresses.length;i++) {
            // Skip IPv6 addresses
            let wsServer = result.service.addresses[i];
            if (wsServer.indexOf(':') != -1)
              continue;
            clearTimeout(timeout);   // Cancel timeout
            let addresses = result.service.addresses;
            let wsPort = result.service.port;
            window.localStorage.setItem('signalkServer', wsServer + ':' + wsPort);
            let signalKServerPath = '/signalk/v1/stream';
            window.localStorage.setItem('signalkServerPath', signalKServerPath);
            let wsServerPath = 'ws://' + wsServer + ':' + wsPort +
                                signalKServerPath + '?subscribe=all&stream=delta';
            setTimeout ( () => this.startWebsocketConnection(wsServerPath), 1000);
            cordova.plugins.zeroconf.unwatch("_signalk-ws._tcp.local.");
            if (successCallback)
              successCallback();
            break;
          }
        });
      });
    });
  }

  obtainServerAddrManually() {
    this.navCtrl.push(ServerFormPage);
  }

  setServerAddress(address: string, path, callback: Function = null) {
    /*
    Sets a new server address (e.g. 192.168.1.2:3000)
    */
    if (this.ws != null) {
      this.ws.close(true);
      this.ws = null;
    }
    window.localStorage.setItem('signalkServer', address);
    window.localStorage.setItem('signalkServerPath', path);
    let wsServerPath = 'ws://' + address + path +
                       '?subscribe=all&stream=delta';
    setTimeout( () => {
      this.startWebsocketConnection(wsServerPath);
      if (callback)
        callback();
    }, 500);
  }

  startWebsocketConnection(wsServerPath) {
    /* 
    We will try to connect to WebSocket server every 30
    seconds, if the connection does not succeed.
 
    If connection is established, this timeout will be
    canceled.
    */
    this.timeout = setTimeout( () => {
      this.startWebsocketConnection(wsServerPath);
    }, 30000);

    if (this.ws == null) {
      this.ws = new $WebSocket(wsServerPath);

      this.ws.onOpen( () => {
        this.connected = true;
        if (this.timeout) {
          clearTimeout(this.timeout);
          this.timeout = null;
        }
        this.events.publish('ws:open', 1);
      });

      this.ws.onClose( () => {
        this.connected = false;
        this.ws.close(true);
        // Upon close of connection, try to reconnect in 10 seconds
        setTimeout( () => this.startWebsocketConnection(wsServerPath), 10000);
        this.events.publish('ws:close', 1);
      });

      this.ws.onError( () => {
        this.connected = false;
        this.ws.close(true);
        // Upon close of connection, try to reconnect in 10 seconds
        setTimeout( () => this.startWebsocketConnection(wsServerPath), 10000);
        this.events.publish('ws:error', 1);
      });

      this.ws.onMessage( (message) => {
        this.events.publish('ws:message', message.data, this.connected);
      }, {filter: '*', autoApply: false});
    }
    this.ws.connect();
  }
}
