import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    // Facebook auth is routing back to _. Don't know why, so just accept it.
    {
        path: '_',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadChildren: 'app/home/home.module#HomeModule'
    },
    {
        path: 'collections',
        loadChildren: 'app/collections/collections.module#CollectionsModule'
    },
    {
        path: 'dance',
        loadChildren: 'app/dance/dance.module#DanceModule'
    },
    {
        path: 'sessions',
        loadChildren: 'app/sessions/sessions.module#SessionsModule'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true, enableTracing: false})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
