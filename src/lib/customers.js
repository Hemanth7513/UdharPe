/**
 * Normalizes a phone string to digits only for duplicate comparison.
 */
export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * Checks if a customer with the same phone number (or exact name when no phone is provided)
 * already exists in the merchant's customer list.
 */
export function findDuplicateCustomer(customers, candidate, excludeId = null) {
  const normalizedPhone = normalizePhone(candidate?.phone);
  const normalizedName = String(candidate?.name || '').trim().toLowerCase();

  return customers.find((c) => {
    if (excludeId && c.id === excludeId) return false;
    if (normalizedPhone && normalizePhone(c.phone) === normalizedPhone) {
      return true;
    }
    if (!normalizedPhone && normalizedName && String(c.name || '').trim().toLowerCase() === normalizedName) {
      return true;
    }
    return false;
  }) || null;
}
