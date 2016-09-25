import {Injectable} from '@angular/core';
import {LoadingController, AlertController, Events} from 'ionic-angular';
import {$WebSocket} from 'angular2-websocket/angular2-websocket';

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
    public loadingCtrl: LoadingController
  ){}

  start(successCallback: Function=null) {
    let loading = this.loadingCtrl.create({
      content: 'Looking for a Signal K Server'
    });
    loading.present().then( () => {
      /*
      We will look for a Signal K Server mDNS advertisement for 4 
      seconds, then ask the user to enter server address manually.

      If mDNS response is received, this timeout will be canceled.
      */
      let timeout = setTimeout( () => {
        loading.dismiss().then( () => {
          cordova.plugins.zeroconf.unwatch("_signalk-ws._tcp.local.");
          this.obtainServerAddrManually(false, successCallback);
        });
      }, 4000);

      cordova.plugins.zeroconf.watch("_signalk-ws._tcp.local.", (result) => {
        loading.dismiss().then( () => {
          clearTimeout(timeout);   // Cancel timeout
          let addresses = result.service.addresses;
          let wsServer = addresses[0];
          let wsPort = result.service.port;
          let wsServerPath = 'ws://' + wsServer + ':' + wsPort +
                              '/signalk/v1/stream?subscribe=all&stream=delta';
          setTimeout ( () => this.startWebsocketConnection(wsServerPath), 500);
          cordova.plugins.zeroconf.unwatch("_signalk-ws._tcp.local.");
          if (successCallback)
            successCallback();
        });
      });
    });
  }

  obtainServerAddrManually(cancelEnabled=false, successCallback: Function=null) {
    let buttons = [
      {
        text: 'OK',
        handler: data => {
          if (data.server != '') {
            // Close WebSocket if it is open
            if (this.ws != null) {
              this.ws.close(true);
              this.ws = null;
            }
            let wsServerPath = 'ws://' + data.server +
                               '/signalk/v1/stream?subscribe=all&stream=delta';
            this.startWebsocketConnection(wsServerPath);
            if (successCallback)
              successCallback();
          }
        }
      }
    ]
    if (cancelEnabled) {
      buttons.splice(0, 0, { 
        text: 'Cancel',
        handler: data => {} 
      });
    }
    let prompt = this.alertCtrl.create({
      title: 'Signal K Server',
      message: "Please enter Signal K Server address",
      inputs: [
        {
          name: 'server',
          placeholder: '(e.g. 192.168.1.2:3000)'
        },
      ],
      buttons: buttons,
    });
    prompt.present();
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
