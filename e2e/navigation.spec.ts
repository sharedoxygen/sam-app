import { test, expect } from '@playwright/test';

const users = [
  { username: 'admin', password: 'adminpass', role: 'ADMIN' },
  { username: 'officemanager', password: 'offmngpass', role: 'OFFICE_MANAGER' },
  { username: 'saleslead', password: 'leadpass', role: 'SALES_LEAD' },
  { username: 'servicelead', password: 'leadpass2', role: 'SERVICE_LEAD' },
  { username: 'salesuser1', password: 'salespass1', role: 'SALES' },
  { username: 'salesuser2', password: 'salespass2', role: 'SALES' },
  { username: 'serviceuser1', password: 'servicepass1', role: 'SERVICE' },
];

const navChecks = {
  ADMIN: [
    { label: /user management/i, path: '/settings/users' },
    { label: /dashboard/i, path: '/dashboard' },
    { label: /reports/i, path: '/reports' },
    { label: /utilities/i, path: '/admin/utilities' },
  ],
  OFFICE_MANAGER: [
    { label: /dashboard/i, path: '/dashboard' },
    { label: /user management/i, path: '/settings/users' },
  ],
  SALES_LEAD: [{ label: /dashboard/i, path: '/dashboard' }],
  SERVICE_LEAD: [{ label: /dashboard/i, path: '/dashboard' }],
  SALES: [{ label: /dashboard/i, path: '/dashboard' }],
  SERVICE: [{ label: /dashboard/i, path: '/dashboard' }],
};

for (const user of users) {
  test.describe(`${user.role} navigation`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="username"]', user.username);
      await page.fill('input[name="password"]', user.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/dashboard/);
    });
    for (const nav of navChecks[user.role as keyof typeof navChecks]) {
      test(`can navigate to ${nav.label} as ${user.username}`, async ({ page }) => {
        // Try to find the link and click it
        await page.getByRole('link', { name: nav.label }).click();
        await expect(page).toHaveURL(nav.path);
      });
    }
  });
}
