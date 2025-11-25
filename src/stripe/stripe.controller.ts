import { 
    Controller, 
    Post, 
    Body, 
    Param, 
    Headers,
    RawBodyRequest,
    Req,
    UseGuards,
    UnauthorizedException,
    Get,
    BadRequestException,
  } from '@nestjs/common';
  import { StripeService } from './stripe.service';
  import { AuthGuard } from '../guards/auth.guard';
  import { Request } from 'express';
import Stripe from 'stripe';
  
  @Controller('stripe')
  export class StripeController {
    constructor(private readonly stripeService: StripeService) {}
  
    @Get('subscriptions/:tenantId/status')
    @UseGuards(AuthGuard) 
    async getSubscriptionStatus(@Param('tenantId') tenantId: string) {
      return this.stripeService.getSubscriptionStatus(Number(tenantId));
    }

    @Post('create-checkout-session/:tenantId')
@UseGuards(AuthGuard)
async createCheckoutSession(
  @Param('tenantId') tenantId: string,
  @Body('priceId') priceId: string,
) {
  return this.stripeService.createCheckoutSession(Number(tenantId), priceId);
}

@Post('customers/:tenantId')
@UseGuards(AuthGuard)
async createCustomer(
  @Param('tenantId') tenantId: string,
  @Body('email') email: string,
  @Req() req: Request,
) {
  try {
    if (req['user']?.type !== 'global_admin') {
      throw new UnauthorizedException('Insufficient permissions');
    }

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    return await this.stripeService.createCustomer(Number(tenantId), email);
  } catch (error) {
    // Log the error for debugging
    console.error('Create customer error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new BadRequestException(error.message);
    }
    
    throw error;
  }
}
  
    @Post('subscriptions/:tenantId')
    @UseGuards(AuthGuard)
    async createSubscription(
      @Param('tenantId') tenantId: string,
      @Body('priceId') priceId: string,
      @Req() req: Request,
    ) {
      if (req['user']?.type !== 'global_admin') {
        throw new UnauthorizedException('Insufficient permissions');
      }
      return this.stripeService.createSubscription(Number(tenantId), priceId);
    }
  
    @Post('subscriptions/:tenantId/cancel')
    @UseGuards(AuthGuard)
    async cancelSubscription(
      @Param('tenantId') tenantId: string,
      @Body('subscriptionId') subscriptionId: string,
      @Req() req: Request,
    ) {
      if (req['user']?.type !== 'global_admin') {
        throw new UnauthorizedException('Insufficient permissions');
      }
      return this.stripeService.cancelSubscription(Number(tenantId), subscriptionId);
    }
  
    @Post('webhook')
    async handleWebhook(
      @Headers('stripe-signature') signature: string,
      @Req() req: RawBodyRequest<Request>,
    ) {
      console.log('Webhook received');
      console.log('Signature:', signature);
      console.log('Raw body exists:', !!req.rawBody);
    
      if (!signature) {
        console.log('Missing signature');
        throw new BadRequestException('Missing stripe-signature header');
      }
    
      if (!req.rawBody) {
        console.log('Missing raw body');
        throw new BadRequestException('No webhook payload was provided');
      }
    
      return this.stripeService.handleWebhook(signature, req.rawBody);
    }
  }