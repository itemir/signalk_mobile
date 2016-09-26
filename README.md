Signal K Mobile
===

<img src='https://raw.githubusercontent.com/itemir/signalk-mobile/master/resources/screenshot.gif' align='left' width='320' height='569' hspace='10' vspace='10'>
Signal K Mobile is a reference mobile app implementation written in Ionic2 for [Signal K](http://signalk.org/), an open data format for marine use. Signal K is NMEA0183 and NMEA2000 compatible, friendly to WiFi, cellphones, tablets and the Internet.

Signal K Mobile requires a Signal K compatible server on the local network. Main features are:

* Support both iOS and Android. Can be ported to other platforms Ionic supports (possibly without Bonjour/mDNS support) fairly easily.
* Detects Signal K server on the network using Bonjour/mDNS. If the server does not advertise itself, an address can be provided manually.
* Displays AIS vessels on Google Maps (requires Internet connectivity for the base map).
* Displays depth, speed, course, wind speed and direction (both apparent and true).
* Re-connects automatically if the server connection goes down and visually indicates if the connection is up or down.
* IMPORTANT NOTE: This is not a navigation app and should not be used for such purpose.


Installation
---

Signal K Mobile requires Ionic and Cordova, refer to [Ionic instructions on setting it up](http://ionicframework.com/docs/v2/getting-started/installation/). In very basic terms:

    $ npm install -g ionic
    $ npm install -g cordova

Building Signal K Mobile for iOS requires Xcode (therefore OS X). Building for Android requires the Android SDK. Make sure you follow the Ionic and Cordova installation instructions carefully and only proceed when it is complete.

When Ionic and Cordova are properly installed:

    $ git clone https://github.com/itemir/signalk-mobile
    $ cd signalk-mobile
    $ npm install
    $ ionic state restore

Assuming Cordova, XCode and/or Android SDK is properly installed, you can run the Signal K Mobile on an emulator or on your device:

    $ ionic emulate ios
    $ ionic emulate android
    $ ionic run ios
    $ ionic run android

When you build for iOS, if you receive the below error, open the project in XCode ("signalk-mobile/platforms/ios/Signal K.xcodeproj") and when prompted, click to convert to Switch 3 syntax.

    “Use Legacy Swift Language Version” (SWIFT_VERSION) is required to be configured correctly for targets which use Swift. Use the [Edit > Convert > To Current Swift Syntax…] menu to choose a Swift version or use the Build Settings editor to configure the build setting directly.

