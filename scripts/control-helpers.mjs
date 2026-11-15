// Exercise both Astryx selectors and the compact native status control on cards.
export async function selectOption(locator, value) {
  const control = locator.and(locator.page().locator('input, select, [role="combobox"]'));
  if (await control.evaluate((element) => element.tagName === 'SELECT')) {
    await control.selectOption(value);
    return;
  }
  await control.click();
  const option = control
    .page()
    .getByRole('option')
    .filter({
      has: control.page().locator(`[data-value="${value}"]`),
    });
  await option.click();
}

export async function controlValue(locator) {
  const control = locator.and(locator.page().locator('input, select, [role="combobox"]'));
  return control.evaluate(
    (element) => element.closest('.select-field')?.getAttribute('data-value') ?? element.value,
  );
}
