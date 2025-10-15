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

for (const user of users) {
  test(`login as ${user.role} (${user.username})`, async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', user.username);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
    // Optionally, check for role-specific dashboard content
    await expect(page.locator('body')).toContainText(/dashboard|performance|activity|welcome/i);
  });
}
