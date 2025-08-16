import { loadStripe, Stripe } from '@stripe/stripe-js'

// Initialize Stripe
let stripePromise: Promise<Stripe | null>
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

export default getStripe

// Plan configurations - LIVE STRIPE PRICE IDS
export const STRIPE_PLANS = {
  basic: {
    monthly: 'price_1RveeGHUii3yXltrohFUcH0U',
    yearly: 'price_1RveewHUii3yXltr3t1YMzaT',
  },
  pro: {
    monthly: 'price_1RvefxHUii3yXltrTsTN5iQg', 
    yearly: 'price_1RvegXHUii3yXltrGWxpvpZi',
  },
  premium: {
    monthly: 'price_1RvehMHUii3yXltrkzeexWpn',
    yearly: 'price_1RvehtHUii3yXltrSSyM6wr3',
  }
}

export interface CheckoutSessionRequest {
  planName: string
  billing: 'monthly' | 'yearly'
  userId: string
  successUrl: string
  cancelUrl: string
}

export const createCheckoutSession = async (request: CheckoutSessionRequest & { userEmail?: string }) => {
  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe failed to initialize')

  // Get the price ID based on plan and billing
  const planKey = request.planName as keyof typeof STRIPE_PLANS
  const plan = STRIPE_PLANS[planKey]
  if (!plan) throw new Error('Invalid plan selected')

  const priceId = plan[request.billing]
  if (!priceId) throw new Error('Invalid billing period')

  // Create checkout session with proper customer handling
  const checkoutOptions: any = {
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: request.successUrl,
    cancelUrl: request.cancelUrl,
    clientReferenceId: request.userId,
    allowPromotionCodes: true,
    billingAddressCollection: 'auto',
    customerCreation: 'always',
    metadata: {
      userId: request.userId,
      planName: request.planName,
      billing: request.billing,
    }
  }

  // Pre-fill customer email if available
  if (request.userEmail) {
    checkoutOptions.customerEmail = request.userEmail
  }

  const { error } = await stripe.redirectToCheckout(checkoutOptions)
  
  if (error) {
    throw new Error(error.message)
  }
}