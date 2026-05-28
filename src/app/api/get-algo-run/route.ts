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
      customerNumber,
      customerName,
      franchise,
      listPrice,
      cost,
      reimbursementRate,
      optimizationType = 'optimize'
    } = body;

    if (!licenseKey || !deviceFingerprint || !listPrice || !cost) {
      return corsResponse({ error: 'MISSING_PARAMS', message: 'licenseKey, deviceFingerprint, listPrice, and cost are required.' }, 400);
    }

    const nListPrice = Number(listPrice);
    const nCost = Number(cost);
    const nReimbRate = Number(reimbursementRate || 0.85);

    const isMockLicense = licenseKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(licenseKey);

    if (!isSupabaseConfigured || !supabase || isMockLicense) {
      // Mock fallback algorithm codes
      let mockAlgo = '';
      if (optimizationType === 'maintain_profit') {
        mockAlgo = `function maintainProfit(listPrice, cost, reimbursementRate) {
          const minProfit = listPrice - cost;
          let low = cost * 0.5;
          let high = listPrice;
          let bestPrice = listPrice;
          for (let i = 0; i < 30; i++) {
            const mid = (low + high) / 2;
            const reimbursement = mid * reimbursementRate;
            const netProfit = mid + reimbursement - cost;
            if (netProfit >= minProfit) {
              bestPrice = mid;
              high = mid;
            } else {
              low = mid;
            }
          }
          return Number(Math.min(listPrice, Math.max(cost * 0.5, bestPrice)).toFixed(2));
        }`;
      } else if (optimizationType === 'optimize') {
        mockAlgo = `function optimize(listPrice, cost, reimbursementRate, minProfit) {
          let low = cost * 0.5;
          let high = listPrice;
          let bestPrice = listPrice;
          for (let i = 0; i < 30; i++) {
            const mid = (low + high) / 2;
            const reimbursement = mid * reimbursementRate;
            const netProfit = mid + reimbursement - cost;
            if (netProfit >= minProfit) {
              bestPrice = mid;
              high = mid;
            } else {
              low = mid;
            }
          }
          return Number(Math.min(listPrice, Math.max(cost * 0.5, bestPrice)).toFixed(2));
        }`;
      } else if (optimizationType === 'max_reimbursement') {
        mockAlgo = `function maxReimbursement(listPrice, cost, reimbursementRate, maxReimbMode) {
          if (maxReimbMode === 'match_non_shop') {
            return Number((listPrice * 0.95).toFixed(2));
          }
          return Number(listPrice.toFixed(2));
        }`;
      }

      return corsResponse({
        success: true,
        algoCode: mockAlgo,
        minProfit: nListPrice - nCost,
        maxReimbMode: 'highest_price',
        reimbursementRate: nReimbRate,
        ruleApplied: 'mock-rules'
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
      return corsResponse({ error: 'UNAUTHORIZED', message: 'No active session found.' }, 401);
    }

    // Fetch license and dealer status
    const { data: license } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseKey)
      .single();

    if (!license) {
      return corsResponse({ error: 'INVALID_LICENSE' }, 404);
    }

    const dealerId = license.dealer_account_id;

    const { data: dealer } = await supabase
      .from('dealer_accounts')
      .select('*')
      .eq('id', dealerId)
      .single();

    if (!dealer || dealer.status === 'suspended' || dealer.status === 'expired') {
      return corsResponse({ error: 'DEALER_INACTIVE' }, 403);
    }

    // 2. Resolve rules
    let rule: any = null;
    let ruleApplied = 'global-default';

    const { data: masterRule } = await supabase
      .from('account_rules')
      .select('*')
      .eq('dealer_account_id', dealerId)
      .is('customer_number', null)
      .is('franchise', null)
      .maybeSingle();

    const masterPercent = masterRule ? Number(masterRule.min_profit_percent) : 10.0;

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

    if (!rule) {
      rule = masterRule || { min_profit_percent: 10.0, min_profit_dollars: 0, priority: 'percent' };
      ruleApplied = masterRule ? 'master-fallback' : 'global-default';
    }

    // 3. Compute target minProfit
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

    // 4. Retrieve pricing code settings
    const { data: algoSettings } = await supabase
      .from('algorithm_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    let algoCode = '';
    const isBeta = dealer?.pricing_version === 'beta';

    if (algoSettings) {
      if (optimizationType === 'maintain_profit') {
        algoCode = isBeta ? (algoSettings.maintain_profit_code_beta || algoSettings.maintain_profit_code) : algoSettings.maintain_profit_code;
      } else if (optimizationType === 'optimize') {
        algoCode = isBeta ? (algoSettings.optimize_code_beta || algoSettings.optimize_code) : algoSettings.optimize_code;
      } else if (optimizationType === 'max_reimbursement') {
        algoCode = isBeta ? (algoSettings.max_reimb_code_beta || algoSettings.max_reimb_code) : algoSettings.max_reimb_code;
      }
    }

    return corsResponse({
      success: true,
      algoCode,
      minProfit,
      maxReimbMode: dealer?.max_reimb_mode || 'highest_price',
      reimbursementRate: nReimbRate,
      ruleApplied
    });

  } catch (err: any) {
    console.error('API get-algo-run error:', err);
    return corsResponse({ error: 'SERVER_ERROR', message: err.message }, 500);
  }
}
