import { test, expect } from '@playwright/test';

const users = [
  { username: 'salesuser1', password: 'salespass1', role: 'SALES' },
  { username: 'serviceuser1', password: 'servicepass1', role: 'SERVICE' },
  { username: 'saleslead', password: 'leadpass', role: 'SALES_LEAD' },
  { username: 'servicelead', password: 'leadpass2', role: 'SERVICE_LEAD' },
  { username: 'officemanager', password: 'offmngpass', role: 'OFFICE_MANAGER' },
];

const protectedRoutes = [
  { path: '/settings/users', allowed: ['ADMIN', 'OFFICE_MANAGER'] },
  { path: '/admin', allowed: ['ADMIN'] },
  { path: '/admin/utilities', allowed: ['ADMIN', 'OFFICE_MANAGER'] },
  { path: '/reports', allowed: ['ADMIN', 'OFFICE_MANAGER', 'SALES_LEAD', 'SERVICE_LEAD'] },
];

for (const user of users) {
  test.describe(`${user.role} access control`, () => {
    for (const route of protectedRoutes) {
      test(`tries to access ${route.path}`, async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/login');
        await expect(page).toHaveURL(/login/);
        await page.waitForSelector('input[name="username"]');
        await page.fill('input[name="username"]', user.username);
        await page.fill('input[name="password"]', user.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/dashboard/);

        await page.goto(route.path);
        if (route.allowed.includes(user.role)) {
          await expect(page).not.toHaveURL('/dashboard'); // Should stay on the page
        } else {
          await expect(page).toHaveURL('/dashboard'); // Should be redirected
        }
      });
    }
  });
}
