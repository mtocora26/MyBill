import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function onboard(page: Page) {
  await page.goto('/')
  await page.getByLabel('Moneda').selectOption('COP')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByText('Aún no tienes movimientos')).toBeVisible()
}

async function addMovement(page: Page, opts: { type: 'Gasto' | 'Ingreso'; amount: string; category: string; note?: string }) {
  await page.goto('/movimientos/nuevo')
  await page.getByRole('radio', { name: opts.type, exact: true }).click()
  await page.getByPlaceholder('0').fill(opts.amount)
  await page.getByRole('radio', { name: opts.category }).click()
  if (opts.note) await page.getByLabel('Descripción (opcional)').fill(opts.note)
  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect(page.getByText(opts.type === 'Gasto' ? 'Gasto registrado' : 'Ingreso registrado')).toBeVisible()
}

test('registrar, editar y eliminar un gasto', async ({ page }) => {
  await onboard(page)
  await addMovement(page, { type: 'Ingreso', amount: '3.000.000', category: 'Salario' })
  await addMovement(page, { type: 'Gasto', amount: '45000', category: 'Comida', note: 'Almuerzo' })

  await page.goto('/')
  const hero = page.getByRole('region', { name: 'Resumen del periodo' })
  await expect(hero).toContainText('2.955.000')
  await expect(hero).toContainText('45.000')

  await page.getByRole('link', { name: /Comida.*Almuerzo/ }).click()
  await page.getByPlaceholder('0').fill('50000')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await page.goto('/')
  await expect(hero).toContainText('2.950.000')

  await page.getByRole('link', { name: /Comida.*Almuerzo/ }).click()
  await page.getByRole('button', { name: 'Eliminar movimiento' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Movimiento eliminado')).toBeVisible()
  await page.goto('/movimientos')
  await expect(page.getByText('Almuerzo')).toHaveCount(0)
})

test('valida el formulario', async ({ page }) => {
  await onboard(page)
  await page.goto('/movimientos/nuevo')
  await page.getByRole('button', { name: 'Guardar gasto' }).click()
  await expect(page.getByRole('alert')).toContainText('importe mayor que cero')
  await page.getByPlaceholder('0').fill('1000')
  await page.getByRole('button', { name: 'Guardar gasto' }).click()
  await expect(page.getByRole('alert')).toContainText('Elige una categoría')
})

test('reportes muestran totales y gráficas con tabla accesible', async ({ page }) => {
  await onboard(page)
  await addMovement(page, { type: 'Ingreso', amount: '2000000', category: 'Salario' })
  await addMovement(page, { type: 'Gasto', amount: '300000', category: 'Mercado' })
  await addMovement(page, { type: 'Gasto', amount: '100000', category: 'Transporte' })
  await page.goto('/reportes')
  await expect(page.getByText('Tasa de ahorro')).toBeVisible()
  await expect(page.getByText(/^80\s?%$/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ingresos y gastos por mes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Calendario de gasto' })).toBeVisible()
  const card = page.getByRole('region', { name: 'Gastos por categoría' })
  await card.getByRole('button', { name: 'Ver tabla' }).click()
  await expect(card.getByRole('table')).toContainText('Mercado')
  await expect(card.getByRole('table')).toContainText(/75\s?%/)
})

test('funciona sin conexión después de la primera carga', async ({ page, context }) => {
  await onboard(page)
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active)
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Sin conexión')).toBeVisible()
  await addMovement(page, { type: 'Gasto', amount: '12000', category: 'Comida', note: 'Sin red' })
  await page.goto('/reportes')
  await expect(page.getByRole('heading', { name: 'Gastos por categoría' })).toBeVisible()
  await context.setOffline(false)
})

test('exporta CSV y restaura un respaldo en otro navegador', async ({ page, browser }) => {
  await onboard(page)
  await addMovement(page, { type: 'Gasto', amount: '45000', category: 'Comida', note: 'Café en Bogotá' })
  await page.goto('/ajustes')

  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()])
  const csv = await readFile((await csvDl.path())!, 'utf8')
  expect(csv.charCodeAt(0)).toBe(0xfeff)
  expect(csv).toContain('Gasto;Comida;Café en Bogotá;45000;-45000;COP')

  const [jsonDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Crear respaldo' }).click()])
  const backupPath = (await jsonDl.path())!
  await expect(page.getByText('Respaldo creado')).toBeVisible()

  const other = await browser.newContext({ locale: 'es-CO', timezoneId: 'America/Bogota' })
  const p2 = await other.newPage()
  await onboard(p2)
  await p2.goto('/ajustes')
  await p2.locator('input[type=file]').setInputFiles({ name: 'respaldo.json', mimeType: 'application/json', buffer: await readFile(backupPath) })
  const dialog = p2.getByRole('dialog')
  await expect(dialog).toContainText('¿Reemplazar tus datos con este respaldo?')
  await dialog.getByRole('button', { name: 'Reemplazar datos' }).click()
  await expect(p2.getByText('Respaldo restaurado: 1 movimientos.')).toBeVisible()
  await p2.goto('/movimientos')
  await expect(p2.getByText('Café en Bogotá')).toBeVisible()
  await other.close()
})

test('rechaza un respaldo inválido sin tocar los datos', async ({ page }) => {
  await onboard(page)
  await addMovement(page, { type: 'Gasto', amount: '1000', category: 'Comida', note: 'Se queda' })
  await page.goto('/ajustes')
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"Otra"}') })
  await expect(page.getByText('no parece ser un respaldo de MyBill')).toBeVisible()
  await page.goto('/movimientos')
  await expect(page.getByText('Se queda')).toBeVisible()
})
