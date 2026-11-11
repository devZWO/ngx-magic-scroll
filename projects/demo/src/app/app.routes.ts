import { Routes } from '@angular/router';
import { DetailExample, DocumentExample, DrawerExample, NavigationExample } from './examples';
import { DestinationsExample } from './destinations-example';
import { leaveDelayGuard } from './leave-delay.guard';
import { MasterDetailExample } from './master-detail-example';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'document' },
  { path: 'master-detail', component: MasterDetailExample },
  { path: 'document', component: DocumentExample },
  { path: 'navigation', component: NavigationExample, canDeactivate: [leaveDelayGuard] },
  { path: 'navigation/detail/:id', component: DetailExample },
  { path: 'drawer', component: DrawerExample },
  { path: 'destinations', component: DestinationsExample },
  { path: 'drawer/detail/:id', component: DetailExample },
  {
    path: 'slow-lazy',
    loadComponent: async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      return (await import('./slow-lazy-example')).SlowLazyExample;
    },
  },
];
