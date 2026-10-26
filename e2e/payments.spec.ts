import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await page.getByLabel('Moneda').selectOption('COP')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByText('Aún no tienes movimientos')).toBeVisible()
}

async function addCommitment(page: Page, opts: { name: string; amount: string; category: string; installments?: [string, string] }) {
  await page.goto('/pagos/nuevo')
  await page.getByLabel('Nombre').fill(opts.name)
  await page.getByLabel('Importe aproximado').fill(opts.amount)
  await page.getByRole('radio', { name: opts.category }).click()
  if (opts.installments) {
    await page.getByLabel('Tiene un número de cuotas').check()
    await page.getByLabel('Total de cuotas').fill(opts.installments[0])
    await page.getByLabel('Cuotas ya pagadas').fill(opts.installments[1])
  }
  await page.getByRole('button', { name: 'Agregar pago fijo' }).click()
  await expect(page.getByText('Pago fijo agregado')).toBeVisible()
}

test('registrar pagos fijos, pagarlos, omitirlos y deshacer', async ({ page }) => {
  await onboard(page)
  await page.goto('/pagos')
  await expect(page.getByText('Lleva el control de tus pagos fijos')).toBeVisible()

  await addCommitment(page, { name: 'Arriendo', amount: '1.500.000', category: 'Vivienda' })
  await addCommitment(page, { name: 'Crédito carro', amount: '800000', category: 'Deudas', installments: ['12', '3'] })
  await addCommitment(page, { name: 'Gimnasio', amount: '90000', category: 'Salud' })

  await page.goto('/pagos')
  await expect(page.getByText('Cuota 4 de 12')).toBeVisible()
  await expect(page.getByText(/0 de 3 pagados/)).toBeVisible()

  // Pagar el arriendo con un valor distinto al estimado.
  const rent = page.locator('div.rounded-2xl', { hasText: 'Arriendo' }).first()
  await page.getByRole('link', { name: 'Pagar Arriendo' }).click()
  await expect(page.getByText('Pago de Arriendo', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('0')).toHaveValue('1500000')
  await page.getByPlaceholder('0').fill('1450000')
  await page.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(page.getByText('Pago de Arriendo registrado')).toBeVisible()

  await page.goto('/pagos')
  const paid = page.getByRole('region', { name: 'Pagados' })
  await expect(paid).toContainText('Arriendo')
  await expect(paid).toContainText('1.450.000')

  // El gimnasio no aplica este mes.
  await page.getByRole('button', { name: 'Más opciones para Gimnasio' }).click()
  await page.getByRole('button', { name: 'No aplica este mes' }).click()
  await expect(page.getByRole('region', { name: 'No aplican este mes' })).toContainText('Gimnasio')
  await expect(page.getByText(/1 de 2 pagados/)).toBeVisible()

  // El inicio muestra el resumen y el pago aparece como gasto normal.
  await page.goto('/')
  const card = page.getByRole('region', { name: 'Pagos del mes' })
  await expect(card).toContainText(/1 de 2 pagados/)
  await expect(card).toContainText('Crédito carro')
  await expect(page.getByRole('region', { name: 'Resumen del periodo' })).toContainText('1.450.000')

  // Eliminar el pago lo deja pendiente otra vez.
  await page.goto('/pagos')
  await paid.getByRole('link', { name: /Arriendo, pagado/ }).click()
  await expect(page.getByText('Pago de Arriendo', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar movimiento' }).click()
  await expect(page.getByRole('dialog')).toContainText('volverá a quedar pendiente')
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Movimiento eliminado')).toBeVisible()
  await page.goto('/pagos')
  await expect(page.getByText(/0 de 2 pagados/)).toBeVisible()
})

test('los pagos fijos viajan en el respaldo', async ({ page }) => {
  await onboard(page)
  await addCommitment(page, { name: 'Internet', amount: '95000', category: 'Servicios' })
  await page.goto('/ajustes')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Crear respaldo' }).click()])
  const json = JSON.parse(await (await import('node:fs/promises')).readFile((await dl.path())!, 'utf8'))
  expect(json.schemaVersion).toBe(3)
  expect(json.commitments[0].name).toBe('Internet')
})
