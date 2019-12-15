import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AmplifyAngularModule, AmplifyService, AmplifyModules} from 'aws-amplify-angular';
import Auth from '@aws-amplify/auth';
import Storage from '@aws-amplify/storage';
import API from "@aws-amplify/api";

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ServicesModule} from "./services/services.module";
import {ToastrModule} from 'ngx-toastr';
import {SharedModule} from "./shared/shared.module";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ServiceWorkerModule} from "@angular/service-worker";
import {environment} from "../environments/environment";

/**
 * Configure toast notifications.
 * https://www.npmjs.com/package/ngx-toastr
 */
const toastOptions = {
    autoDismiss: true,
    closeButton: true,
    newestOnTop: false,
    positionClass: 'toast-bottom-right'
};


@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        SharedModule,
        // Angular
        BrowserAnimationsModule,
        BrowserModule,
        environment.useServiceWorker ? ServiceWorkerModule.register('/ngsw-worker.js') : [],
        // Others
        ToastrModule.forRoot(toastOptions),
        // SqAC
        AppRoutingModule,
        ServicesModule,
        // Amplify
        AmplifyAngularModule,
    ],
    providers: [
        {
            provide: AmplifyService,
            useFactory:  () => {
                return AmplifyModules({
                    Auth,
                    API,
                    Storage,
                });
            }
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
