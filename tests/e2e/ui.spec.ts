import { expect, test } from '@playwright/test';

test('opens without login and offers one-step folder selection', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requests.push(pathname);
    if (pathname.endsWith('/session')) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"SESSION_REQUIRED"}' });
    if (pathname.endsWith('/session/bootstrap')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"csrfToken":"csrf"}' });
    if (pathname.endsWith('/health')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    if (pathname.endsWith('/roots')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"roots":[]}' });
    if (pathname.endsWith('/stats')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"tracks":0,"artists":0,"albums":0,"genres":0,"complete":0,"incomplete":0,"unidentified":0,"duplicates":0,"playlistsUnlocked":false}' });
    if (pathname.endsWith('/jobs/current') || pathname.endsWith('/plans/current')) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"NOT_FOUND"}' });
    if (pathname.endsWith('/settings')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"mode":"simulation","internetEnabled":false,"openaiEnabled":false,"openaiModel":"gpt-5.6-luna"}' });
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Elige tu biblioteca' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seleccionar carpeta de música' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Autorizar esta carpeta al servicio local' })).toHaveCount(0);
  await expect(page.getByText(/token|vincular/i)).toHaveCount(0);
  expect(requests).not.toContain('/api/session');
  await page.getByRole('button', { name: 'Configuración' }).click();
  await expect(page.getByLabel('Clave API de OpenAI')).toHaveAttribute('type', 'password');
});
