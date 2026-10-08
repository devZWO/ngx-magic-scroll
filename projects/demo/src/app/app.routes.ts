import { Routes } from '@angular/router';
import { DetailExample, DocumentExample, DrawerExample, NavigationExample } from './examples';
import { MasterDetailExample } from './master-detail-example';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'document' },
  { path: 'master-detail', component: MasterDetailExample },
  { path: 'document', component: DocumentExample },
  { path: 'navigation', component: NavigationExample },
  { path: 'navigation/detail/:id', component: DetailExample },
  { path: 'drawer', component: DrawerExample },
  { path: 'drawer/detail/:id', component: DetailExample },
];
