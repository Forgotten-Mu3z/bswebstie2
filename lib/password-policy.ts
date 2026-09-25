// Shared by the server (which enforces it) and the change-password form
// (which shows the same checklist while typing).

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

// Frequently leaked passwords and patterns at or above the minimum length.
const COMMON = [
  'password',
  'passw0rd',
  'qwerty',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'iloveyou',
  'letmein',
  'welcome',
  'admin',
  'administrator',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'superman',
  'batman',
  'trustno1',
  'sunshine',
  'princess',
  'starwars',
  'whatever',
  'computer',
  'internet',
  'blackshark',
  'bsgaming',
  'gaming',
  'oman',
  'muscat',
  'changeme',
];

const SEQUENCES = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

export type PasswordCheck = { id: string; label: string; ok: boolean };

function hasSequence(password: string) {
  const lower = password.toLowerCase();
  for (const sequence of SEQUENCES) {
    for (const text of [sequence, sequence.split('').reverse().join('')])
      for (let start = 0; start + 5 <= text.length; start++)
        if (lower.includes(text.slice(start, start + 5))) return true;
  }
  return false;
}

export function checkPassword(password: string, email = ''): PasswordCheck[] {
  const lower = password.toLowerCase();
  const normalized = lower
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's');
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  const passphrase = password.length >= 20;

  return [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN} characters`,
      ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    },
    {
      id: 'variety',
      label: '3 of: lowercase, uppercase, number, symbol (or 20+ characters)',
      ok: passphrase || classes >= 3,
    },
    {
      id: 'common',
      label: 'No common words like "password" or the store name',
      ok: !COMMON.some(
        (word) => lower.includes(word) || normalized.includes(word),
      ),
    },
    {
      id: 'pattern',
      label: 'No runs like "12345", "abcde" or "qwert"',
      ok: !hasSequence(password) && !/(.)\1{3,}/.test(password),
    },
    {
      id: 'unique',
      label: 'At least 6 different characters',
      ok: new Set(password).size >= 6,
    },
    {
      id: 'email',
      label: 'Does not contain your email name',
      ok: local.length < 3 || !lower.includes(local),
    },
  ];
}

export function passwordProblems(password: string, email = '') {
  return checkPassword(password, email).filter((check) => !check.ok);
}
