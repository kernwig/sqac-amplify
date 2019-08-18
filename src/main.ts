import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

import Amplify from '@aws-amplify/core';
import awsconfig from './aws-exports';
Amplify.configure(awsconfig);


platformBrowserDynamic().bootstrapModule(AppModule);
