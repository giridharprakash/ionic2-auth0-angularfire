import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { Page1 } from '../pages/page1/page1';
import { Page2 } from '../pages/page2/page2';
import {Storage} from '@ionic/storage';
import { AuthConfig, AuthHttp } from 'angular2-jwt';
import {Http} from "@angular/http";
import {AuthService} from "../services/auth.service";
import {AngularFireModule} from "angularfire2";

let storage: Storage = new Storage();

export function getAuthHttp(http) {
  return new AuthHttp(new AuthConfig({
    globalHeaders: [{'Accept': 'application/json'}],
    tokenGetter: (() => storage.get('id_token'))
  }), http);
}

export const firebaseConfig = {
  apiKey: 'AIzaSyB7RVksMT-wOB8XPNMXbFp4YB682aBv9bI',
  authDomain: "activity-challenge-dev.firebaseapp.com",
  databaseURL: "https://activity-challenge-dev.firebaseio.com",
  storageBucket: "activity-challenge-dev.appspot.com",
  messagingSenderId: "401929554442"
};

@NgModule({
  declarations: [
    MyApp,
    Page1,
    Page2
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(firebaseConfig)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    Page1,
    Page2
  ],
  providers: [AuthService, {provide: ErrorHandler, useClass: IonicErrorHandler},{
    provide: AuthHttp,
    useFactory: getAuthHttp,
    deps: [Http]
  }]
})
export class AppModule {}
