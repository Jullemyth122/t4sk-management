import axios from 'axios';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db;
try {
    if (!getApps().length) {
        initializeApp({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || 't4sk-management'
        });
    }
    db = getFirestore();
} catch (e) {
    console.warn("Firebase Admin failed to initialize. Database updates will be skipped.", e.message);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing checkout session ID' });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      console.warn("⚠️ PAYMONGO_SECRET_KEY missing - MOCKING SUCCESSFUL PAYMENT.");
      // In mock mode, still update Firestore if businessId and planType are provided
      const { businessId, planType } = req.body;
      let dbUpdateFailed = true;
      if (db && businessId && planType) {
        try {
          await db.collection('businesses').doc(businessId).update({ planType });
          console.log(`[Mock Verify] Upgraded business ${businessId} to ${planType}`);
          dbUpdateFailed = false;
        } catch (e) {
          console.error(`[Mock Verify] Failed to update Firestore:`, e.message);
        }
      }
      return res.status(200).json({ status: 'paid', mock: true, dbUpdateFailed, businessId, planType });
    }

    // Base64 encode the secret key required by PayMongo Basic Auth.
    const authToken = Buffer.from(`${secretKey}:`).toString('base64');

    const options = {
      method: 'GET',
      url: `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
      headers: {
        accept: 'application/json',
        authorization: `Basic ${authToken}`
      }
    };

    const response = await axios.request(options);
    
    // Check if the checkout session was successfully paid
    const checkoutData = response.data.data;
    const payments = checkoutData.attributes.payments;
    
    // A successful checkout session creates a payment intent, which results in payments
    // We check if there are any successful payments associated with this session
    const isPaid = payments && payments.some(payment => payment.attributes.status === 'paid');

    if (isPaid) {
      // In production, you might also want to verify the metadata payload matches 
      // the requesting user, though the session ID itself acts as a secure token.
      const metadata = checkoutData.attributes.metadata;
      
      // Securely upgrade the database from the backend, bypassing firestore rules
      let dbUpdateFailed = true;
      if (db && metadata?.businessId && metadata?.planType) {
         try {
             await db.collection('businesses').doc(metadata.businessId).update({
                 planType: metadata.planType
             });
             console.log(`[Verify] Successfully upgraded business ${metadata.businessId} to ${metadata.planType}`);
             dbUpdateFailed = false;
         } catch(e) {
             console.error(`[Verify] Failed to update business ${metadata.businessId}:`, e.message);
         }
      }

      return res.status(200).json({ 
        status: 'paid',
        dbUpdateFailed,
        businessId: metadata?.businessId,
        planType: metadata?.planType
      });
    } else {
      return res.status(400).json({ status: 'unpaid', message: 'Payment has not been completed.' });
    }

  } catch (error) {
    console.error('PayMongo Verify Error:', error?.response?.data || error.message);
    // DO NOT return 500 error page HTML from vite, strictly return JSON
    return res.status(500).json({ 
      error: error?.response?.data || error.message || 'Internal Server Error verifying payment'
    });
  }
}
