import {Component} from '@angular/core';
import {SignalK} from '../signalk/signalk';

@Component({
  templateUrl: 'build/pages/about/about.html'
})
export class AboutPage {
  constructor(
    public signalK: SignalK
  ){}
}
