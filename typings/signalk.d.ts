interface skPosition {
  timestamp: string;
  altitude: number;
  latitude: number;
  longitude: number;
}  

interface skNavigation {
  position: skPosition;
  state: string;
  speedOverGround: number;
  headingTrue: number;
  courseOverGroundTrue: number;
}
 
interface skCommunication {
  callSignVhf: string;
}

interface skVessel {
  name: string;
  mmsi: number;
  navigation: skNavigation;
  communication: skCommunication;
}
