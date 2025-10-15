import { test, expect } from '@playwright/test';

const admin = { username: 'admin', password: 'adminpass' };

test.describe('Agent Management Forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', admin.username);
    await page.fill('input[name="password"]', admin.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('can create a new agent', async ({ page }) => {
    await page.goto('/settings/users');
    await page.getByRole('button', { name: /add user|new agent|create/i }).click();
    await page.fill('input[name="name"]', 'Test Agent');
    await page.fill('input[name="username"]', 'testagent');
    await page.fill('input[name="email"]', 'testagent@example.com');
    await page.selectOption('select[name="role"]', 'SALES');
    await page.fill('input[name="password"]', 'testpass123');
    await page.fill('input[name="confirmPassword"]', 'testpass123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.message-container')).toContainText(/created|success/i);
  });

  test('form validation: password mismatch', async ({ page }) => {
    await page.goto('/settings/users');
    await page.getByRole('button', { name: /add user|new agent|create/i }).click();
    await page.fill('input[name="name"]', 'Test Agent');
    await page.fill('input[name="username"]', 'testagent2');
    await page.fill('input[name="email"]', 'testagent2@example.com');
    await page.selectOption('select[name="role"]', 'SALES');
    await page.fill('input[name="password"]', 'testpass123');
    await page.fill('input[name="confirmPassword"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('.message-container')).toContainText(/passwords do not match/i);
  });
});
