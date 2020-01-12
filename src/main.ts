import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

import Amplify from '@aws-amplify/core';
import awsconfig from './aws-exports';

// Choose an OAuth config based on environment
const redirectSignInOptions = awsconfig.oauth.redirectSignIn.split(',');
const redirect = environment.production
    ? redirectSignInOptions.find(s => s.startsWith('https'))
    : redirectSignInOptions.find(s => s.includes('localhost'));
awsconfig.oauth.redirectSignIn = redirect;
awsconfig.oauth.redirectSignOut = redirect;

Amplify.configure(awsconfig);


platformBrowserDynamic().bootstrapModule(AppModule);
