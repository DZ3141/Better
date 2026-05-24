import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function corsResponse(data: any, status = 200) {
  const response = NextResponse.json(data, { status });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      licenseKey,
      deviceFingerprint,
      partNumber,
      customerNumber,
      customerName,
      franchise,
      listPrice,
      cost,
      reimbursementRate,
      optimizationType = 'optimize'
    } = body;

    // Validate params
    if (!licenseKey || !deviceFingerprint || !partNumber || !listPrice || !cost) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'licenseKey, deviceFingerprint, partNumber, listPrice, and cost are required.' }, 400);
    }

    const nListPrice = Number(listPrice);
    const nCost = Number(cost);
    const nReimbRate = Number(reimbursementRate || 0.85);

    if (!isSupabaseConfigured || !supabase) {
      // Mock mode fallback for local testing
      const mockOptimizedPrice = optimizationType === 'maintain_profit'
        ? Math.max(nCost * 0.8, Number((nListPrice / (1 + nReimbRate)).toFixed(2)))
        : Number((nCost * 1.1).toFixed(2));
      const mockReimb = Number((mockOptimizedPrice * nReimbRate).toFixed(2));
      return corsResponse({
        optimizedPrice: mockOptimizedPrice,
        reimbursementAmount: mockReimb,
        marginAchieved: Number((((mockOptimizedPrice - nCost) / nCost) * 100).toFixed(1)),
        ruleApplied: 'mock-fallback'
      });
    }

    // 1. Validate session
    const { data: session, error: sessError } = await supabase
      .from('sessions')
      .select('*')
      .eq('license_id', licenseKey)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (sessError || !session) {
      return corsResponse({ error: 'UNAUTHORIZED', message: 'No active session found. Please authenticate via the extension.' }, 401);
    }

    // Fetch license and dealer to get dealer_account_id and verify account status
    const { data: license, error: licError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseKey)
      .single();

    if (licError || !license) {
      return corsResponse({ error: 'INVALID_LICENSE', message: 'License key not found.' }, 404);
    }

    const dealerId = license.dealer_account_id;

    const { data: dealer, error: dealerError } = await supabase
      .from('dealer_accounts')
      .select('*')
      .eq('id', dealerId)
      .single();

    if (dealerError || !dealer || dealer.status === 'suspended' || dealer.status === 'expired') {
      return corsResponse({ error: 'DEALER_INACTIVE', message: 'Dealer account is inactive or suspended.' }, 403);
    }

    // 2. Determine markup rules
    let rule: any = null;
    let ruleApplied = 'global-default';

    // A. Query master fallback (needed to auto-add new customers if they arise)
    const { data: masterRule } = await supabase
      .from('account_rules')
      .select('*')
      .eq('dealer_account_id', dealerId)
      .is('customer_number', null)
      .is('franchise', null)
      .maybeSingle();

    const masterPercent = masterRule ? Number(masterRule.min_profit_percent) : 10.0;

    // B. Check customer-specific rules
    if (customerNumber) {
      const { data: custRule } = await supabase
        .from('account_rules')
        .select('*')
        .eq('dealer_account_id', dealerId)
        .eq('customer_number', customerNumber)
        .maybeSingle();

      if (custRule) {
        rule = custRule;
        ruleApplied = `customer-${customerNumber}`;
      } else {
        // Auto-add customer to rule list with master defaults
        const { data: newCustRule } = await supabase
          .from('account_rules')
          .insert({
            dealer_account_id: dealerId,
            customer_number: customerNumber,
            customer_name: customerName || 'Unknown Shop',
            franchise: franchise || null,
            min_profit_percent: masterPercent,
            min_profit_dollars: 0,
            priority: 'percent'
          })
          .select()
          .single();

        rule = newCustRule;
        ruleApplied = `customer-${customerNumber}-auto`;
      }
    }

    // C. Check franchise override rules if no customer override rule found
    if (!rule && franchise) {
      const { data: franRule } = await supabase
        .from('account_rules')
        .select('*')
        .eq('dealer_account_id', dealerId)
        .is('customer_number', null)
        .eq('franchise', franchise)
        .maybeSingle();

      if (franRule) {
        rule = franRule;
        ruleApplied = `franchise-${franchise}`;
      }
    }

    // D. Use master rule as fallback
    if (!rule) {
      rule = masterRule || { min_profit_percent: 10.0, min_profit_dollars: 0, priority: 'percent' };
      ruleApplied = masterRule ? 'master-fallback' : 'global-default';
    }

    // 3. Calculate target minProfit dollars
    let minProfit = 0;
    if (optimizationType === 'maintain_profit') {
      minProfit = nListPrice - nCost;
    } else {
      const minByPercent = nCost * (Number(rule.min_profit_percent) / 100);
      const minByDollars = Number(rule.min_profit_dollars || 0);
      minProfit = rule.priority === 'percent'
        ? Math.max(minByPercent, minByDollars)
        : Math.max(minByDollars, minByPercent);
    }

    // 4. Run binary search optimization
    // We want to find the MINIMUM selling price P such that:
    // P + (P * nReimbRate) - nCost >= minProfit
    let low = nCost * 0.5; // Allow selling below cost (discount offset by manufacturer reimbursement)
    let high = nListPrice;
    let bestPrice = nListPrice;

    // Run binary search down to sub-cent precision (30 steps is plenty)
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      const reimbursement = mid * nReimbRate;
      const netProfit = mid + reimbursement - nCost;

      if (netProfit >= minProfit) {
        bestPrice = mid;
        high = mid; // Try to offer an even lower price to win the sale
      } else {
        low = mid; // Need to price higher to meet profit requirement
      }
    }

    const optimizedPrice = Number(Math.min(nListPrice, Math.max(nCost * 0.5, bestPrice)).toFixed(2));
    const reimbursementAmount = Number((optimizedPrice * nReimbRate).toFixed(2));
    const marginAchieved = Number((((optimizedPrice - nCost) / nCost) * 100).toFixed(1));

    // 5. Save the price result
    await supabase.from('price_results').insert({
      dealer_account_id: dealerId,
      user_id: license.user_id,
      part_number: partNumber,
      customer_number: customerNumber || null,
      customer_name: customerName || null,
      franchise: franchise || null,
      original_price: nListPrice,
      optimized_price: optimizedPrice,
      reimb_amount: reimbursementAmount,
      cost: nCost,
      margin_achieved: marginAchieved,
      optimization_type: optimizationType
    });

    return corsResponse({
      optimizedPrice,
      reimbursementAmount,
      marginAchieved,
      ruleApplied
    });

  } catch (err: any) {
    console.error('Price optimization error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
