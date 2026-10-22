import { ValidationError } from '@/database/errors';
import { ilsToAgorot } from '@/database/money';
import {
  assertNonNegativeBalance,
  assertSufficientBalance,
  validateCreateDreamInput,
  validateCreateTransactionInput,
} from '@/database/validation';

export type AssertionResult = {
  name: string;
  passed: boolean;
  detail?: string;
};

export function runValidationAssertions(): AssertionResult[] {
  const results: AssertionResult[] = [];

  const run = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({
        name,
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };

  run('valid create dream input', () => {
    validateCreateDreamInput({
      title: 'חלום',
      targetAmountAgorot: 100,
      imageType: 'builtIn',
      imageReference: 'car',
      accentColor: 'primary',
    });
  });

  run('reject zero target', () => {
    let failed = false;
    try {
      validateCreateDreamInput({
        title: 'חלום',
        targetAmountAgorot: 0,
        imageType: 'builtIn',
        imageReference: 'car',
        accentColor: 'primary',
      });
    } catch (error) {
      failed = error instanceof ValidationError;
    }
    if (!failed) {
      throw new Error('expected ValidationError');
    }
  });

  run('reject invalid transaction amount', () => {
    let failed = false;
    try {
      validateCreateTransactionInput({ dreamId: 'x', amountAgorot: -5 });
    } catch (error) {
      failed = error instanceof ValidationError;
    }
    if (!failed) {
      throw new Error('expected ValidationError');
    }
  });

  run('sufficient balance check', () => {
    assertSufficientBalance(1_000, 500);
  });

  run('reject over-withdrawal', () => {
    let failed = false;
    try {
      assertSufficientBalance(100, 101);
    } catch (error) {
      failed = error instanceof ValidationError;
    }
    if (!failed) {
      throw new Error('expected ValidationError');
    }
  });

  run('non-negative balance', () => {
    assertNonNegativeBalance(0);
  });

  run('agorot conversion for decimal shekels', () => {
    if (ilsToAgorot(125.5) !== 12_550) {
      throw new Error('expected 12550 agorot');
    }
  });

  return results;
}
