import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('homepage should have main heading and sign-up CTA', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify main heading is visible
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();

    // Verify sign-up CTA exists and is clickable
    // Look for link or button that navigates to /sign-up
    const signUpCTA = page.locator('a[href="/sign-up"], button:has-text("Sign up"), a:has-text("Sign up")').first();
    await expect(signUpCTA).toBeVisible();

    // Click the sign-up CTA and verify navigation
    await signUpCTA.click();

    // Wait for navigation to complete
    await page.waitForURL('**/sign-up');

    // Verify we're on the sign-up page
    expect(page.url()).toContain('/sign-up');
  });
});