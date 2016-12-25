import {Injectable} from '@angular/core';
import {JwtHelper, AuthHttp, tokenNotExpired} from "angular2-jwt";
import {Observable} from "rxjs";
import {Storage} from '@ionic/storage';
import {AngularFire, AuthMethods, AuthProviders} from "angularfire2";
import {Auth0Vars} from "../auth0-variables";

// Avoid name not found warnings
declare var Auth0: any;
declare var Auth0Lock: any;

@Injectable()
export class AuthService {
  jwtHelper: JwtHelper = new JwtHelper();
  auth0 = new Auth0({clientID: Auth0Vars.AUTH0_CLIENT_ID, domain: Auth0Vars.AUTH0_DOMAIN});
  lock = new Auth0Lock(Auth0Vars.AUTH0_CLIENT_ID, Auth0Vars.AUTH0_DOMAIN, {
    auth: {
      redirect: false,
      params: {
        scope: 'openid offline_access',
      }
    },

  });
  storage: Storage = new Storage();
  refreshSubscription: any;
  user: Object;
  //oneImpl: NgZone;
  idToken: string;

  constructor(private authHttp: AuthHttp, private angularFire: AngularFire) {
    //this.zoneImpl = zone;
    // Check if there is a profile saved in local storage
    this.storage.get('profile').then(profile => {
      this.user = JSON.parse(profile);
    }).catch(error => {
      console.log(error);
    });

    this.storage.get('id_token').then(token => {
      this.idToken = token;
    });

    this.lock.on('authenticated', (authResult) => {
      this.storage.set('id_token', authResult.idToken);
      this.idToken = authResult.idToken;

      console.log("auth0 authentication" + JSON.stringify(authResult));
      //Fetch profile information
      this.lock.getProfile(authResult.idToken, (error, profile) => {
        if (error) {
          // Handle error
          alert(error);
          return;
        }
        console.log("auth0 got profile" + JSON.stringify(profile));

        profile.user_metadata = profile.user_metadata || {};
        this.storage.set('profile', JSON.stringify(profile));
        this.user = profile;
      });

      this.lock.hide();

      this.storage.set('refresh_token', authResult.refreshToken);
      //this.zoneImpl.run(() => this.user = authResult.profile);
      // Schedule a token refresh
      //this.scheduleRefresh();
      this.getFirebaseToken();
    });
  }

  private getFirebaseToken() {
    var options = {
      id_token: this.idToken,
      api: 'firebase',
      scope: 'openid name email displayName',
      target: Auth0Vars.AUTH0_CLIENT_ID
    };

    this.auth0.getDelegationToken(options, (err, result) => {
      if (!err) {
        console.log("got delegation token" + JSON.stringify(result));

        this.angularFire.auth.login(result.id_token, {method: AuthMethods.CustomToken, provider: AuthProviders.Custom})
          .then(success => console.log("git firebase token" + JSON.stringify(success))).catch(function (error) {
          console.log(error);
        });
      }
    });
  }

  public authenticated() {
    return tokenNotExpired('id_token', this.idToken);
  }

  public login() {
    // Show the Auth0 Lock widget
    this.lock.show();
  }

  public logout() {
    this.storage.remove('profile');
    this.storage.remove('id_token');
    this.idToken = null;
    this.storage.remove('refresh_token');
    //this.zoneImpl.run(() => this.user = null);


    this.angularFire.auth.logout();

    // Unschedule the token refresh
    this.unscheduleRefresh();
  }

  public scheduleRefresh() {
    // If the user is authenticated, use the token stream
    // provided by angular2-jwt and flatMap the token

    let source = Observable.of(this.idToken).flatMap(
      token => {
        console.log('token here', token);
        // The delay to generate in this case is the difference
        // between the expiry time and the issued at time
        let jwtIat = this.jwtHelper.decodeToken(token).iat;
        let jwtExp = this.jwtHelper.decodeToken(token).exp;
        let iat = new Date(0);
        let exp = new Date(0);

        let delay = (exp.setUTCSeconds(jwtExp) - iat.setUTCSeconds(jwtIat));

        return Observable.interval(delay);
      });

    this.refreshSubscription = source.subscribe(() => {
      this.getNewJwt();
    });
  }

  public startupTokenRefresh() {
    // If the user is authenticated, use the token stream
    // provided by angular2-jwt and flatMap the token
    if (this.authenticated()) {
      let source = Observable.of(this.idToken).flatMap(
        token => {
          // Get the expiry time to generate
          // a delay in milliseconds
          let now: number = new Date().valueOf();
          let jwtExp: number = this.jwtHelper.decodeToken(token).exp;
          let exp: Date = new Date(0);
          exp.setUTCSeconds(jwtExp);
          let delay: number = exp.valueOf() - now;

          // Use the delay in a timer to
          // run the refresh at the proper time
          return Observable.timer(delay);
        });

      // Once the delay time from above is
      // reached, get a new JWT and schedule
      // additional refreshes
      source.subscribe(() => {
        this.getNewJwt();
        this.scheduleRefresh();
      });
    }
  }

  public unscheduleRefresh() {
    // Unsubscribe fromt the refresh
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  public getNewJwt() {
    // Get a new JWT from Auth0 using the refresh token saved
    // in local storage
    this.storage.get('refresh_token').then(token => {
      this.auth0.refreshToken(token, (err, delegationRequest) => {
        if (err) {
          alert(err);
        }
        this.storage.set('id_token', delegationRequest.id_token);
        this.idToken = delegationRequest.id_token;
      });
    }).catch(error => {
      console.log(error);
    });

  }
}
