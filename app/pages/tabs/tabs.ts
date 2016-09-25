import {Platform} from 'ionic-angular';
import {Component} from '@angular/core';
import {SignalK} from '../signalk/signalk';
import {PanelPage} from '../panel/panel';
import {AISPage} from '../ais/ais';
import {AboutPage} from '../about/about';

declare var cordova;

@Component({
  templateUrl: 'build/pages/tabs/tabs.html',
  providers: [SignalK]
})
export class TabsPage {
  PanelRoot: any;
  AISRoot: any;
  AboutRoot: any;

  constructor(platform: Platform) {
    this.PanelRoot = PanelPage;
    this.AISRoot = AISPage;
    this.AboutRoot = AboutPage;
  }
}
