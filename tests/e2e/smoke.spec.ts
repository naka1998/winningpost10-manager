import { expect, type Page, test } from '@playwright/test';

function createMinimalTsvRow(values: Record<string, string>): string {
  const headers = [
    '馬名',
    '国',
    '年',
    '性',
    'SP',
    '力',
    '瞬',
    '勝',
    '精',
    '賢',
    '芝',
    'ダ',
    '距離適性',
    '成型',
    '脚質',
    '特性',
    '父馬',
    '父系',
    '母馬',
    '牝系',
    '戦績',
    '騎手',
    '史実',
  ];

  const row = headers.map((header) => values[header] ?? '').join('\t');
  return `${headers.join('\t')}\n${row}\n`;
}

async function uploadAndMoveToSettings(page: Page, horseName: string) {
  const tsv = createMinimalTsvRow({
    馬名: horseName,
    国: '日',
    年: '3',
    性: '牡',
    SP: '82(5)',
    力: 'A(3)',
    瞬: 'B+(6)',
    勝: 'C(2)',
    精: 'B(8)',
    賢: 'A(1)',
    芝: '◎',
    ダ: '○',
    距離適性: '1600～2200m',
    成型: '普早',
    脚質: '先行',
    特性: '大舞台',
    父馬: `${horseName}父`,
    父系: `${horseName}父系`,
    母馬: `${horseName}母`,
    戦績: '1 - 1 - 0 - 0',
    騎手: 'E2E騎手',
    史実: '',
  });

  await page.goto('/horses/import');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'import-smoke.tsv',
    mimeType: 'text/tab-separated-values',
    buffer: Buffer.from(tsv, 'utf-8'),
  });

  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page.getByText('インポート設定')).toBeVisible();
}

async function runImport(page: Page, horseName: string) {
  await uploadAndMoveToSettings(page, horseName);

  await page.getByRole('button', { name: 'パース実行' }).click();
  await expect(page.getByText('パース完了: 1 行')).toBeVisible();

  await page.getByRole('button', { name: 'プレビュー' }).click();
  await expect(page.getByText('インポートプレビュー')).toBeVisible();
  await expect(page.getByText('新規: 1')).toBeVisible();

  await page.getByRole('button', { name: 'インポート実行' }).click();
  await expect(page.getByText('インポート完了')).toBeVisible();
  await expect(page.getByText('作成: 1件')).toBeVisible();
}

test.describe('E2E smoke', () => {
  test('インポートを実行できる', async ({ page }) => {
    await runImport(page, 'E2EテストホースA');
  });

  test('インポート設定（年度）を更新してプレビューに反映できる', async ({ page }) => {
    await uploadAndMoveToSettings(page, 'E2EテストホースB');

    const yearInput = page.locator('#import-year');
    await yearInput.fill('2030');
    await expect(yearInput).toHaveValue('2030');

    await page.getByRole('button', { name: 'パース実行' }).click();
    await page.getByRole('button', { name: 'プレビュー' }).click();
    await expect(page.getByText('2030年度 — 1件')).toBeVisible();
  });

  test('インポート結果から新しいインポートに戻れる', async ({ page }) => {
    await runImport(page, 'E2EテストホースC');

    await page.getByRole('button', { name: '新しいインポート' }).click();
    await expect(page.getByText('ファイル選択', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '次へ' })).toBeDisabled();
  });
});
