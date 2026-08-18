import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { Payment } from '../db/Payment';
import { User } from '../db/User';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = express.Router();

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = process.env.ESEWA_FORM_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';
const KHALTI_INITIATE_URL = 'https://dev.khalti.com/api/v2/epayment/initiate/';
const KHALTI_LOOKUP_URL = 'https://dev.khalti.com/api/v2/epayment/lookup/';

const BASE_URL = process.env.BASE_URL || '';
const FRONTEND_URL = process.env.FRONTEND_URL || BASE_URL;

const PLAN_PRICES: Record<'monthly' | 'annual', number> = { monthly: 299, annual: 2999 };

function generateEsewaSignature(message: string, secretKey: string) {
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

async function activatePremium(userId: string, plan: 'monthly' | 'annual') {
  const durationDays = plan === 'annual' ? 365 : 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  await User.findByIdAndUpdate(userId, {
    subscription: { status: 'premium', plan, expiresAt },
  });
}

router.post('/esewa/initiate', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { plan } = req.body as { plan: 'monthly' | 'annual' };
    if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const amount = PLAN_PRICES[plan];
    const transaction_uuid = randomUUID();

    await Payment.create({
      user: req.userId,
      gateway: 'esewa',
      transactionUuid: transaction_uuid,
      amount,
      plan,
      status: 'pending',
    });

    const message = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = generateEsewaSignature(message, ESEWA_SECRET_KEY);

    res.json({
      formUrl: ESEWA_FORM_URL,
      fields: {
        amount,
        tax_amount: 0,
        total_amount: amount,
        transaction_uuid,
        product_code: ESEWA_MERCHANT_CODE,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: `${BASE_URL}/api/payment/esewa/verify`,
        failure_url: `${FRONTEND_URL}/premium?status=failed`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
    });
  } catch (err) {
    console.error('eSewa initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate eSewa payment' });
  }
});

router.get('/esewa/verify', async (req, res) => {
  try {
    const decoded = JSON.parse(Buffer.from(req.query.data as string, 'base64').toString('utf-8'));
    const { transaction_uuid, total_amount, status, transaction_code } = decoded;

    const payment = await Payment.findOne({ transactionUuid: transaction_uuid });
    if (!payment) return res.redirect(`${FRONTEND_URL}/premium?status=failed`);

    const message = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${ESEWA_MERCHANT_CODE},signed_field_names=${decoded.signed_field_names}`;
    const expectedSignature = generateEsewaSignature(message, ESEWA_SECRET_KEY);
    if (expectedSignature !== decoded.signature) {
      payment.status = 'failed';
      await payment.save();
      return res.redirect(`${FRONTEND_URL}/premium?status=failed`);
    }

    const statusRes = await axios.get(ESEWA_STATUS_URL, {
      params: { product_code: ESEWA_MERCHANT_CODE, total_amount, transaction_uuid },
    });

    if (statusRes.data.status === 'COMPLETE') {
      payment.status = 'success';
      payment.gatewayRefId = transaction_code;
      payment.rawResponse = statusRes.data;
      await payment.save();
      await activatePremium(payment.user.toString(), payment.plan);
      return res.redirect(`${FRONTEND_URL}/premium?status=success`);
    }

    payment.status = 'failed';
    await payment.save();
    res.redirect(`${FRONTEND_URL}/premium?status=failed`);
  } catch (err) {
    console.error('eSewa verify error:', err);
    res.redirect(`${FRONTEND_URL}/premium?status=failed`);
  }
});

router.post('/khalti/initiate', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { plan } = req.body as { plan: 'monthly' | 'annual' };
    if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const amount = PLAN_PRICES[plan];
    const transaction_uuid = randomUUID();
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Payment.create({
      user: req.userId,
      gateway: 'khalti',
      transactionUuid: transaction_uuid,
      amount,
      plan,
      status: 'pending',
    });

    const response = await axios.post(
      KHALTI_INITIATE_URL,
      {
        return_url: `${FRONTEND_URL}/premium/khalti-callback`,
        website_url: FRONTEND_URL,
        amount: amount * 100,
        purchase_order_id: transaction_uuid,
        purchase_order_name: `Smart Exam Preparation - ${plan} plan`,
        customer_info: { name: user.name, email: user.email },
      },
      { headers: { Authorization: `Key ${KHALTI_SECRET_KEY}` } }
    );

    res.json({ paymentUrl: response.data.payment_url, pidx: response.data.pidx, transaction_uuid });
  } catch (err: any) {
    console.error('Khalti initiate error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate Khalti payment' });
  }
});

router.post('/khalti/verify', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { pidx, transaction_uuid } = req.body;

    const lookupRes = await axios.post(
      KHALTI_LOOKUP_URL,
      { pidx },
      { headers: { Authorization: `Key ${KHALTI_SECRET_KEY}` } }
    );

    const payment = await Payment.findOne({ transactionUuid: transaction_uuid });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    if (lookupRes.data.status === 'Completed') {
      payment.status = 'success';
      payment.gatewayRefId = pidx;
      payment.rawResponse = lookupRes.data;
      await payment.save();
      await activatePremium(payment.user.toString(), payment.plan);
      return res.json({ status: 'success' });
    }

    payment.status = 'failed';
    await payment.save();
    res.json({ status: 'failed' });
  } catch (err: any) {
    console.error('Khalti verify error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
