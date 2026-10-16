// Paystack inline checkout (Mobile Money: MTN, Telecel, AirtelTigo + cards).
// NOTE: client-side success is optimistic. For production, verify the reference
// server-side (see README → "Verifying payments").

let loading;
const loadScript = () => {
  if (window.PaystackPop) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v1/inline.js';
      s.onload = resolve;
      s.onerror = () => { loading = null; reject(new Error('Could not load Paystack. Check your connection.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
};

export const payWithPaystack = async ({ key, email, amount, reference, phone, channels, metadata }) => {
  await loadScript();
  return new Promise((resolve, reject) => {
    const handler = window.PaystackPop.setup({
      key,
      email,
      amount: Math.round(amount * 100), // pesewas
      currency: 'GHS',
      ref: reference,
      channels: channels || ['mobile_money', 'card', 'bank_transfer'],
      metadata: { ...metadata, phone },
      callback: (response) => resolve(response),
      onClose: () => reject(new Error('closed')),
    });
    handler.openIframe();
  });
};
