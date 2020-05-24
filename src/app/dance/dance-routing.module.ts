import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {DancePageComponent} from './dance-page.component';

const routes: Routes = [
    {
        path: '',
        component: DancePageComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DanceRoutingModule {
}
