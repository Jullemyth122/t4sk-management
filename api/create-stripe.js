import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, planType } = req.body;

    if (!businessId || !planType) {
      return res.status(400).json({ error: 'Missing businessId or planType' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:5173';
    const originUrl = req.headers.origin || `${protocol}://${host}`;

    // Auto-Mock for Local Testing: If no Stripe Key is present, bypass the real gateway 
    // and teleport the user directly to the success page to test the UI flow.
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn("⚠️ STRIPE_SECRET_KEY is missing. Using mock checkout redirect for local testing.");
      return res.status(200).json({ 
        url: `${originUrl}/payment-success?session_id=mock_session&plan=${planType}&biz=${businessId}` 
      });
    }

    // Determine Pricing (using test prices or amounts logic)
    // Production note: Usually you'd create Products/Prices in Stripe dashboard and pass price IDs.
    // Here we dynamically create the inline price for testing simplicity:
    const amountInCents = planType === 'enterprise' ? 850 : 400; // $8.50 or $4.00
    const planName = planType === 'enterprise' ? 'Enterprise Plan' : 'Pro Plan';

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `T4SK Management - ${planName}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Pass along business details to retrieve after success
      metadata: {
        businessId: businessId,
        planType: planType
      },
      // When deployed or running via standard `vercel dev`, req.headers.origin has the base URL.
      success_url: `${originUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planType}&biz=${businessId}`,
      cancel_url: `${originUrl}/pricing`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
