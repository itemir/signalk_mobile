import {Component} from '@angular/core';
import {ionicBootstrap, Platform} from 'ionic-angular';
import {StatusBar} from 'ionic-native';
import {TabsPage} from './pages/tabs/tabs';

@Component({
  template: '<ion-nav [root]="rootPage"></ion-nav>'
})
export class MyApp {
  rootPage: any = TabsPage;

  constructor(
    platform: Platform
  ) {
    platform.ready().then(() => {
      StatusBar.styleLightContent();
    });
  }
}

ionicBootstrap(MyApp);
