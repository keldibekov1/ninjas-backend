import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia',
    });
  }

  async getSubscriptionStatus(tenantId: number) {
    const subscription = await this.prisma.stripeSubscription.findFirst({
      where: {
        customer: {
          tenantId,
        },
        OR: [
          { status: 'ACTIVE' },
          { status: 'TRIALING' }
        ]
      },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!subscription) {
      return { subscription: null };
    }

    return {
      subscription: {
        id: subscription.id,
        subscriptionId: subscription.subscriptionId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        canceledAt: subscription.canceledAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        latestInvoice: subscription.invoices[0] || null,
      },
    };
  }

  async createCheckoutSession(tenantId: number, priceId: string) {
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { tenantId },
      include: { tenant: true }
    });
  
    if (!customer) {
      throw new NotFoundException(`No Stripe customer found for tenant ${tenantId}`);
    }
  
    const session = await this.stripe.checkout.sessions.create({
      customer: customer.customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get('FRONTEND_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/subscription/canceled`,
    });
  
    return { url: session.url };
  }

  async createCustomer(tenantId: number, email: string) {
    // First check if a customer already exists
    const existingCustomer = await this.prisma.stripeCustomer.findUnique({
      where: { tenantId },
    });

    if (existingCustomer) {
      // If customer exists but email is different, update the email
      if (existingCustomer.email !== email) {
        await this.stripe.customers.update(existingCustomer.customerId, { email });
        return this.prisma.stripeCustomer.update({
          where: { tenantId },
          data: { email },
        });
      }
      return existingCustomer;
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    try {
      // Create Stripe customer
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          tenantId: tenantId.toString(),
        },
      });

      // Create customer record in database
      return await this.prisma.stripeCustomer.create({
        data: {
          tenantId,
          customerId: customer.id,
          email,
        },
      });
    } catch (error) {
      // Handle potential race conditions
      if (error.code === 'P2002') {
        const existingCustomer = await this.prisma.stripeCustomer.findUnique({
          where: { tenantId },
        });
        if (existingCustomer) {
          return existingCustomer;
        }
        throw new ConflictException('Customer creation failed due to concurrent request');
      }
      throw error;
    }
  }
  async createSubscription(tenantId: number, priceId: string) {
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`No Stripe customer found for tenant ${tenantId}`);
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: customer.customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return this.prisma.stripeSubscription.create({
      data: {
        stripeCustomerId: customer.id,
        subscriptionId: subscription.id,
        status: subscription.status.toUpperCase() as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  
  async cancelSubscription(tenantId: number, subscriptionId: string) {
    try {
      // Verify subscription exists and belongs to tenant
      const subscription = await this.prisma.stripeSubscription.findFirst({
        where: {
          customer: { tenantId },
          subscriptionId,
          status: 'ACTIVE',
        },
      });
  
      if (!subscription) {
        throw new NotFoundException(`No active subscription found for tenant ${tenantId}`);
      }
  
      // Cancel the subscription in Stripe
      await this.stripe.subscriptions.cancel(subscriptionId.trim());
  
      // Update subscription status in database
      return await this.prisma.stripeSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelAtPeriodEnd: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    ) as Stripe.Event;
  
    // Add this case
    if (event.type === 'checkout.session.completed') {
      await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
    else if (event.type === 'invoice.paid') {
      await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
    } 
    else if (event.type === 'customer.subscription.updated') {
      await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
    }
    else if (event.type === 'customer.subscription.deleted') {
      await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    }
  
    return { received: true };
  }
  
  // Add this new handler method
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return;
  
    // Get the subscription details
    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string
    );
  
    // Get the customer
    const customer = await this.prisma.stripeCustomer.findFirst({
      where: { customerId: session.customer as string }
    });
  
    if (!customer) {
      throw new Error(`No customer found for Stripe customer ID: ${session.customer}`);
    }
  
    // Create or update subscription in database
    await this.prisma.stripeSubscription.create({
      data: {
        stripeCustomerId: customer.id,
        subscriptionId: subscription.id,
        status: subscription.status.toUpperCase() as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
  
    // Get or create subscription record
    const subscription = await this.prisma.stripeSubscription.upsert({
      where: { 
        subscriptionId: invoice.subscription as string 
      },
      create: {
        subscriptionId: invoice.subscription as string,
        status: 'ACTIVE',
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
        stripeCustomerId: (await this.prisma.stripeCustomer.findFirst({
          where: { customerId: invoice.customer as string }
        }))?.id || 0
      },
      update: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(invoice.period_start * 1000), 
        currentPeriodEnd: new Date(invoice.period_end * 1000)
      }
    });
  
    // Create invoice record
    await this.prisma.stripeInvoice.create({
      data: {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'PAID',
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        pdfInvoiceUrl: invoice.invoice_pdf,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    await this.prisma.stripeSubscription.updateMany({
      where: { subscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase() as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.prisma.stripeSubscription.updateMany({
      where: { subscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });
  }
}