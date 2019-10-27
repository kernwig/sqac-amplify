import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {ListCollectionsComponent} from "./list-collections.component";
import {EditFormationsComponent} from "./formation/edit-formations.component";
import {EditFamiliesComponent} from "./family/edit-families.component";
import {EditCallsComponent} from "./call/edit-calls.component";
import {ListModulesComponent} from "./module/list-modules.component";
import {EditModuleComponent} from "./module/edit-module.component";
import {SearchCollectionsComponent} from "./search-collections.component";

const routes: Routes = [
    {
        path: '',
        component: ListCollectionsComponent
    },
    {
        path: 'search',
        component: SearchCollectionsComponent
    },
    {
        path: ':cid',
        component: ListCollectionsComponent
    },
    {
        path: ':cid/history',
        component: ListCollectionsComponent
    },
    {
        path: ':cid/calls',
        component: EditCallsComponent
    },
    {
        path: ':cid/families',
        component: EditFamiliesComponent
    },
    {   // deprecated
        path: ':cid/formations',
        component: EditFormationsComponent
    },
    {
        path: ':cid/setups',
        component: EditFormationsComponent
    },
    {
        path: ':cid/modules',
        component: ListModulesComponent
    },
    {
        path: ':cid/modules/:mid',
        component: EditModuleComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CollectionsRoutingModule { }
