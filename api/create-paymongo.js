import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, planType } = req.body;

    if (!businessId || !planType) {
      return res.status(400).json({ error: 'Missing businessId or planType' });
    }

    // Pro: $4 * 58 = ₱232. Enterprise: $8.50 * 58 = ₱493.
    // PayMongo expects amounts in cents (₱232 = 23200, ₱493 = 49300)
    const amountInCents = planType === 'enterprise' ? 49300 : 23200;
    const planName = planType === 'enterprise' ? 'Enterprise Plan' : 'Pro Plan';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:5173';
    const originUrl = req.headers.origin || `${protocol}://${host}`;

    // Auto-Mock for Local Testing: If no PayMongo Key is present, bypass the real gateway 
    // and teleport the user directly to the success page to test the UI flow.
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
        console.warn("⚠️ PAYMONGO_SECRET_KEY is missing. Using mock checkout redirect for local testing.");
        // We pass fake session_id that we'll mock verify later, plus the plan/biz for the mock fallback
        return res.status(200).json({ 
          url: `${originUrl}/payment-success?session_id=mock_session_123&plan=${planType}&biz=${businessId}` 
        });
    }

    // Base64 encode the secret key required by PayMongo Basic Auth.
    const authToken = Buffer.from(`${secretKey}:`).toString('base64');

    const options = {
      method: 'POST',
      url: 'https://api.paymongo.com/v1/checkout_sessions',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${authToken}`
      },
      data: {
        data: {
          attributes: {
            billing: {
              name: 'T4SK User' // Optionally grab user's real name from frontend if needed
            },
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            description: `T4SK Management - ${planName}`,
            line_items: [
              {
                currency: 'PHP',
                amount: amountInCents,
                description: 'Monthly Subscription',
                name: planName,
                quantity: 1
              }
            ],
            // In TEST mode: 'card' works immediately. 'gcash' and 'paymaya' also 
            // work in test mode without dashboard activation.
            payment_method_types: ['gcash', 'card'],
            // IMPORTANT UPDATE: Wait, PayMongo doesn't support templating the session ID into the success_url natively
            // like Stripe does with {CHECKOUT_SESSION_ID}.
            // Instead, we will pass the businessId and planType directly into the success_url just so the 
            // frontend knows what we tried to buy, but we MUST STILL VERIFY the webhook or require the 
            // user to fetch their own payments to see if it succeeded.
            // Wait, actually, PayMongo redirects back to `success_url` but DOES NOT append the session ID automatically.
            // HOWEVER, we have access to the checkout URL before we send it to the client. We shouldn't put the secret
            // session ID in the URL. So how does the frontend verify? 
            // The best way with PayMongo is Webhooks. But we want a seamless client redirect flow.
            // 
            // Let's check: When PayMongo redirects to success_url, does it append anything? Usually no.
            // But we are creating the session NOW, so we know the session object structure.
            success_url: `${originUrl}/payment-success?plan=${planType}&biz=${businessId}`,
            // In a real production app, verify metadata or webhooks for security. 
            metadata: {
              businessId: businessId,
              planType: planType
            }
          }
        }
      }
    };

    const response = await axios.request(options);
    
    // PayMongo returns the checkout URL here
    const checkoutUrl = response.data.data.attributes.checkout_url;
    const checkoutSessionId = response.data.data.id;
    
    // TEMPORARY FIX: Since PayMongo doesn't automatically append the session ID to the success URL upon redirect,
    // and we cannot predict user navigation exactly, the absolute most secure way for SPA flow is to store the 
    // pending checkout in Firebase, and have the webhook fulfill it. 
    // BUT to keep the current architecture working simply and securely, we will append the session ID to our 
    // success_url mathematically right here, by overriding the checkout's reference if possible, OR
    // we just have the client pass the session ID it received initially back to the success page locally.
    // 
    // Actually, we can just pass the session ID to the frontend when they CREATE the checkout, 
    // and the frontend can persist it in sessionStorage, and when they return to `/payment-success`, 
    // the frontend pulls from sessionStorage and asks the backend to verify it!
    
    return res.status(200).json({ 
      url: checkoutUrl,
      sessionId: checkoutSessionId 
    });
  } catch (error) {
    console.error('PayMongo handler error:', error?.response?.data || error.message);
    // Ensure we always return JSON to prevent Vite from sending 500 HTML dumps that cause "Failed to fetch"
    const errorMessage = typeof error?.response?.data === 'object' 
      ? JSON.stringify(error.response.data) 
      : (error.message || 'Unknown Server Error');
      
    return res.status(500).json({ error: errorMessage });
  }
}
