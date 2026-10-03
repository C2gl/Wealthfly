import { useTranslation } from '../i18n.jsx';
import {
  formatCurrency as formatCurrencyValue,
  formatDate as formatDateValue,
  transactionAmountMeta as transactionAmountMetaValue,
} from '../utils.js';

// Translation plus the formatting helpers, already bound to the active language.
export function useFormatters() {
  const { t, language } = useTranslation();
  return {
    t,
    language,
    formatCurrency: (value, currency) => formatCurrencyValue(value, currency, language),
    formatDate: (value) => formatDateValue(value, language),
    transactionAmountMeta: (transaction) => transactionAmountMetaValue(transaction, language),
  };
}
