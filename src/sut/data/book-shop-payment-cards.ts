export function buildPaymentCard() {
  // 20 dígitos ficticios requeridos por GAD, fuera de longitud PAN habitual.
  const digits = Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => String(value % 10)).join('');
  return { card_number: `9900${digits}`, cvv: '12345', expiration_date: '2099-12-31' };
}
export const initialCardBalance = 50_000;
export const validTopupAmounts = [100, 50_000];
export const invalidCardFields = {
  card_number: [undefined, '', '1'.repeat(19), '1'.repeat(21), 'a'.repeat(20)],
  cvv: [undefined, '', '1234', '123456', 'abcde'],
  expiration_date: [undefined, '', '2099-02-30', '2099-13-01', '2000-01-01', 'qa-invalid'],
};
export const invalidTopupAmounts = [undefined, null, false, '', 'qa-invalid', -100, 0, 99, 100001];
export const invalidTopupCvvs = [undefined, '', '54321'];
export const ignoredCardFields = { account_id: 999999, balance: 99999999 };
