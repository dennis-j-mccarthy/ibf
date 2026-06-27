// Read-only BigCommerce client: customer lookup by email only.
// Must only ever issue GET /v3/customers — never create or modify customers.

interface BcCustomer {
  id: number;
  email: string;
}

// Returns the BigCommerce customer id for an email, or null if no customer
// exists (or BigCommerce is unreachable — callers treat both the same to
// avoid leaking which emails have accounts).
export async function findCustomerIdByEmail(email: string): Promise<number | null> {
  const token = process.env.BIGCOMMERCE_API_TOKEN;
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  if (!token || !storeHash) {
    console.error('BigCommerce env vars are not set');
    return null;
  }
  try {
    const res = await fetch(
      `https://api.bigcommerce.com/stores/${storeHash}/v3/customers?email:in=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: { 'X-Auth-Token': token, Accept: 'application/json' },
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      console.error(`BigCommerce customer lookup failed: ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { data?: BcCustomer[] };
    return body.data?.[0]?.id ?? null;
  } catch (error) {
    console.error('BigCommerce customer lookup error:', error);
    return null;
  }
}
