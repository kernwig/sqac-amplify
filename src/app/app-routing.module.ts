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
        loadChildren: () => import('app/home/home.module').then(m => m.HomeModule)
    },
    {
        path: 'collections',
        loadChildren: () => import('app/collections/collections.module').then(m => m.CollectionsModule)
    },
    {
        path: 'dance',
        loadChildren: () => import('app/dance/dance.module').then(m => m.DanceModule)
    },
    {
        path: 'sessions',
        loadChildren: () => import('app/sessions/sessions.module').then(m => m.SessionsModule)
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true, enableTracing: false})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
