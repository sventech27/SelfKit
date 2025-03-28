import { test, expect } from '@playwright/test';

test('if user not logged in, when click on pricing button then redirect to authentication page', async ({ page }) => {
  await page.goto('http://localhost:4173/payment');

  await page.getByRole('button', { name: 'Get Mysaas' }).click();
  await page.waitForURL('http://localhost:4173/auth/login');

  await expect(page).toHaveURL('http://localhost:4173/auth/login');
});

test('if error occurs when submit contact form, then show error message', async ({ page }) => {
  await page.goto('http://localhost:4173/contact');

  await page.getByLabel('Email').fill('test@test.test');
  await page.getByLabel('Subject').fill('Test');
  await page.getByLabel('Message').fill('test');
  await page.getByRole('button', { name: 'Send Message' }).click();

  await expect(page.getByText('An error occurred when')).toBeVisible();
});