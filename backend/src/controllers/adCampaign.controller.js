import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import {
  buildAuthUrl as buildGoogleAuthUrl,
  exchangeCodeForTokens as exchangeGoogleCode,
  fetchCampaignMetrics as fetchGoogleCampaignMetrics,
  listAccessibleCustomers as listGoogleCustomers,
} from '../services/google-ads.service.js';
import {
  buildAuthUrl as buildMetaAuthUrl,
  exchangeCodeForToken as exchangeMetaCode,
  exchangeForLongLivedToken as exchangeMetaLongLivedToken,
  fetchInsights as fetchMetaInsights,
  inspectToken as inspectMetaToken,
  saveConnection as saveMetaConnection,
  subscribePageToLeadgen as subscribeMetaPage,
  unsubscribePage as unsubscribeMetaPage,
  revokeUserToken as revokeMetaUserToken,
} from '../services/meta-ads.service.js';

// ============================================
// Validation
// ============================================
export const adCampaignValidation = [
  body('name').notEmpty().trim().withMessage('Campaign name is required'),
  body('platform').isIn(['GOOGLE', 'META']).withMessage('Valid platform is required'),
  body('branchId').notEmpty().withMessage('Branch ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
];

// ============================================
// Get All Ad Campaigns
// ============================================
export const getAllCampaigns = async (req, res) => {
  try {
    const { branchId, status, platform, page = 1, limit = 20 } = req.query;

    const where = {};

    // Role-based filtering
    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      where.branchId = branchId;
    }

    if (status) where.status = status;
    if (platform) where.platform = platform;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { leads: true } },
        },
      }),
      prisma.adCampaign.count({ where }),
    ]);

    // Transform to include leads count
    const campaignsWithStats = campaigns.map(c => ({
      ...c,
      leadsCount: c._count.leads,
      _count: undefined,
    }));

    res.json({
      success: true,
      data: {
        campaigns: campaignsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get all campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Get Single Campaign
// ============================================
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        leads: {
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Permission check
    if (req.user.role === 'MANAGER' && campaign.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { campaign },
    });
  } catch (error) {
    console.error('Get campaign by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Create Campaign
// ============================================
export const createCampaign = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const {
      name,
      platform,
      branchId: providedBranchId,
      budget,
      startDate,
      endDate,
      notes,
      googleAccountId,
      googleCampaignId,
      metaAccountId,
      metaAdSetId,
    } = req.body;

    // Determine branchId
    let branchId;
    if (req.user.role === 'ADMIN') {
      branchId = providedBranchId || req.user.branchId;
    } else if (req.user.role === 'MANAGER') {
      branchId = req.user.branchId;
    } else {
      return res.status(403).json({
        success: false,
        error: 'Only admins and managers can create campaigns',
      });
    }

    const campaign = await prisma.adCampaign.create({
      data: {
        name,
        platform,
        branchId,
        budget: parseFloat(budget) || 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes,
        googleAccountId,
        googleCampaignId,
        metaAccountId,
        metaAdSetId,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: { campaign },
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Update Campaign
// ============================================
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, budget, startDate, endDate, notes, googleRefreshToken, metaAccessToken } =
      req.body;

    const existing = await prisma.adCampaign.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Permission check
    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (budget !== undefined) updateData.budget = parseFloat(budget);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (googleRefreshToken !== undefined) updateData.googleRefreshToken = googleRefreshToken;
    if (metaAccessToken !== undefined) updateData.metaAccessToken = metaAccessToken;

    const campaign = await prisma.adCampaign.update({
      where: { id },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { leads: true } },
      },
    });

    res.json({
      success: true,
      data: {
        ...campaign,
        leadsCount: campaign._count.leads,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Delete Campaign
// ============================================
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.adCampaign.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Delete junction records first
    await prisma.adCampaignLead.deleteMany({ where: { campaignId: id } });
    await prisma.adCampaign.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Campaign deleted successfully' },
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Link Lead to Campaign
// ============================================
export const linkLeadToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId } = req.body;

    const campaign = await prisma.adCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    // Check if already linked
    const existing = await prisma.adCampaignLead.findUnique({
      where: {
        leadId_campaignId: { leadId, campaignId: id },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Lead already linked to this campaign',
      });
    }

    // Link the lead and mark it as coming from the campaign's platform
    await prisma.$transaction([
      prisma.adCampaignLead.create({
        data: { leadId, campaignId: id },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { source: campaign.platform === 'GOOGLE' ? 'GOOGLE_ADS' : 'META_ADS' },
      }),
    ]);

    res.json({
      success: true,
      data: { message: 'Lead linked to campaign successfully' },
    });
  } catch (error) {
    console.error('Link lead to campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Unlink Lead from Campaign
// ============================================
export const unlinkLeadFromCampaign = async (req, res) => {
  try {
    const { id, leadId } = req.params;

    await prisma.adCampaignLead.delete({
      where: {
        leadId_campaignId: { leadId, campaignId: id },
      },
    });

    res.json({
      success: true,
      data: { message: 'Lead unlinked from campaign successfully' },
    });
  } catch (error) {
    console.error('Unlink lead from campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Get Campaign Stats
// ============================================
export const getCampaignStats = async (req, res) => {
  try {
    const { branchId } = req.query;

    const where = {};

    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      where.branchId = branchId;
    }

    // Get all campaigns with their lead counts
    const campaigns = await prisma.adCampaign.findMany({
      where,
      include: {
        leads: {
          select: { leadId: true },
        },
      },
    });

    // Calculate totals
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spent, 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leads.length, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;

    // Cost per lead
    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // Best performing campaign (most leads)
    const bestCampaign = campaigns.reduce((best, c) => {
      return c.leads.length > (best?.leads.length || 0) ? c : best;
    }, null);

    // Leads by platform
    const byPlatform = campaigns.reduce((acc, c) => {
      acc[c.platform] = (acc[c.platform] || 0) + c.leads.length;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalSpend,
        totalLeads,
        activeCampaigns,
        costPerLead: parseFloat(costPerLead.toFixed(2)),
        bestCampaign: bestCampaign
          ? {
              id: bestCampaign.id,
              name: bestCampaign.name,
              platform: bestCampaign.platform,
              leadsCount: bestCampaign.leads.length,
              spent: bestCampaign.spent,
            }
          : null,
        byPlatform,
        totalCampaigns: campaigns.length,
      },
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// Sync Google Ads Data
// ============================================
export const syncGoogleAds = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        platform: true,
        googleAccountId: true,
        googleCampaignId: true,
        googleRefreshToken: true,
        branchId: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.platform !== 'GOOGLE') {
      return res.status(400).json({
        success: false,
        error: 'This campaign is not a Google Ads campaign',
      });
    }

    if (!campaign.googleRefreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Ads account not connected. Connect the account first.',
      });
    }

    if (!campaign.googleAccountId) {
      return res.status(400).json({
        success: false,
        error:
          'This campaign has no Google Ads customer ID. Add the ten-digit account number to the campaign.',
      });
    }

    if (!campaign.googleCampaignId) {
      return res.status(400).json({
        success: false,
        error: 'This campaign has no Google Ads campaign ID. Add it to the campaign.',
      });
    }

    const metrics = await fetchGoogleCampaignMetrics({
      refreshToken: campaign.googleRefreshToken,
      customerId: campaign.googleAccountId,
      campaignId: campaign.googleCampaignId,
      dateRange,
    });

    if (!metrics) {
      return res.json({
        success: true,
        data: {
          message: 'Connected, but Google reported no activity for this period',
          details: { synced: true, syncedAt: new Date().toISOString(), spend: 0 },
        },
      });
    }

    // Persist the spend so the dashboard and the campaign list show real numbers.
    // The old implementation returned hardcoded zeroes and never wrote anything,
    // so "sync" reported success while leaving the record untouched.
    await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: { spent: metrics.spend },
    });

    res.json({
      success: true,
      data: {
        message: 'Google Ads data synced',
        details: { ...metrics, synced: true, syncedAt: new Date().toISOString() },
      },
    });
  } catch (error) {
    console.error('Sync Google Ads error:', error);
    // Surface the real reason - "developer token missing" and "account revoked"
    // need completely different fixes, and a generic 500 tells the admin neither.
    res.status(502).json({
      success: false,
      error: error.message || 'Failed to sync Google Ads data',
    });
  }
};

// ============================================
// Sync Meta Ads Data
// ============================================
export const syncMetaAds = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;

    const campaign = await prisma.adCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        platform: true,
        metaAccountId: true,
        metaAdSetId: true,
        metaAccessToken: true,
        branchId: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.platform !== 'META') {
      return res.status(400).json({
        success: false,
        error: 'This campaign is not a Meta Ads campaign',
      });
    }

    // The branch-level connection is refreshed on every reconnect; the token
    // copied onto the campaign row is only kept for older campaigns.
    const connection = await prisma.metaConnection.findUnique({
      where: { branchId: campaign.branchId },
      select: { accessToken: true },
    });
    const accessToken = connection?.accessToken || campaign.metaAccessToken;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Meta Ads account not connected. Connect the account first.',
      });
    }

    if (!campaign.metaAccountId && !campaign.metaAdSetId) {
      return res.status(400).json({
        success: false,
        error: 'This campaign has no Meta ad account ID or ad set ID. Add one to the campaign.',
      });
    }

    const metrics = await fetchMetaInsights({
      accessToken,
      accountId: campaign.metaAccountId,
      adSetId: campaign.metaAdSetId,
      dateRange,
    });

    if (!metrics) {
      return res.json({
        success: true,
        data: {
          message: 'Connected, but Meta reported no activity for this period',
          details: { synced: true, syncedAt: new Date().toISOString(), spend: 0 },
        },
      });
    }

    await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: { spent: metrics.spend },
    });

    res.json({
      success: true,
      data: {
        message: 'Meta Ads data synced',
        details: { ...metrics, synced: true, syncedAt: new Date().toISOString() },
      },
    });
  } catch (error) {
    console.error('Sync Meta Ads error:', error);
    res.status(502).json({
      success: false,
      error: error.message || 'Failed to sync Meta Ads data',
    });
  }
};

// ============================================
// OAuth state
//
// `state` carries the campaign id across the round trip to Google/Meta and
// back. It is also the CSRF defence for the callback, so it is signed with the
// JWT secret rather than being a bare id an attacker could forge.
// ============================================
const STATE_TTL_MS = 10 * 60 * 1000;

const signState = payload => {
  const body = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString('base64url');
  const mac = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'state-secret')
    .update(body)
    .digest('base64url');
  return `${body}.${mac}`;
};

const verifyState = state => {
  if (typeof state !== 'string' || !state.includes('.')) return null;

  const [body, mac] = state.split('.');
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'state-secret')
    .update(body)
    .digest('base64url');

  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (Date.now() - payload.ts > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
};

// ============================================
// OAuth: Google Auth URL
// ============================================
export const getGoogleAuthUrl = async (req, res) => {
  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'Campaign ID is required' });
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, platform: true, branchId: true },
    });

    if (!campaign || campaign.platform !== 'GOOGLE') {
      return res.status(400).json({ success: false, error: 'Invalid Google Ads campaign' });
    }

    const authUrl = buildGoogleAuthUrl(signState({ campaignId: campaign.id, scope: 'campaign' }));

    // `url` matches what the account-level endpoints return, so the frontend
    // can read one field for every connect flow.
    res.json({ success: true, data: { authUrl, url: authUrl } });
  } catch (error) {
    console.error('Get Google auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Google auth URL',
    });
  }
};

// ============================================
// OAuth: Google Callback
// ============================================
export const googleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code and state are required',
      });
    }

    const payload = verifyState(state);
    if (!payload?.campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired authorization state. Start the connection again.',
      });
    }

    const tokens = await exchangeGoogleCode(code);

    // Google only returns a refresh token on first consent. Writing an
    // undefined one over a good stored token is how a working integration
    // silently breaks on reconnect.
    if (!tokens.refresh_token) {
      return res.status(400).json({
        success: false,
        error:
          'Google did not return a refresh token. Remove this app at myaccount.google.com/permissions, then connect again.',
      });
    }

    await prisma.adCampaign.update({
      where: { id: payload.campaignId },
      data: { googleRefreshToken: tokens.refresh_token },
    });

    res.json({
      success: true,
      data: { message: 'Google account connected successfully' },
    });
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect Google account',
    });
  }
};

// ============================================
// OAuth: Meta Auth URL
// ============================================
export const getMetaAuthUrl = async (req, res) => {
  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'Campaign ID is required' });
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, platform: true, branchId: true },
    });

    if (!campaign || campaign.platform !== 'META') {
      return res.status(400).json({ success: false, error: 'Invalid Meta Ads campaign' });
    }

    const authUrl = buildMetaAuthUrl(signState({ campaignId: campaign.id, scope: 'campaign' }));

    res.json({ success: true, data: { authUrl, url: authUrl } });
  } catch (error) {
    console.error('Get Meta auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Meta auth URL',
    });
  }
};

// ============================================
// OAuth: Meta Callback
// ============================================
export const metaAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code and state are required',
      });
    }

    const payload = verifyState(state);
    if (!payload?.campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired authorization state. Start the connection again.',
      });
    }

    const shortLived = await exchangeMetaCode(code);
    // Without this step the stored token dies in about an hour.
    const longLived = await exchangeMetaLongLivedToken(shortLived.access_token);

    const campaign = await prisma.adCampaign.update({
      where: { id: payload.campaignId },
      data: { metaAccessToken: longLived.access_token },
      select: { branchId: true },
    });

    await saveMetaConnection({
      branchId: campaign.branchId,
      userToken: longLived.access_token,
      connectedBy: req.user?.id,
    });

    res.json({
      success: true,
      data: {
        message: 'Meta account connected successfully',
        longLived: longLived.long_lived,
        expiresIn: longLived.expires_in ?? null,
      },
    });
  } catch (error) {
    console.error('Meta auth callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect Meta account',
    });
  }
};

// ============================================
// Account-level OAuth (connect without picking a campaign first)
// ============================================
export const getGoogleAccountAuthUrl = async (req, res) => {
  try {
    const authUrl = buildGoogleAuthUrl(signState({ scope: 'account' }));
    res.json({ success: true, data: { url: authUrl, authUrl } });
  } catch (error) {
    console.error('Get Google account auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Google auth URL',
    });
  }
};

export const googleAccountCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    if (!verifyState(state)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired authorization state. Start the connection again.',
      });
    }

    const tokens = await exchangeGoogleCode(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({
        success: false,
        error:
          'Google did not return a refresh token. Remove this app at myaccount.google.com/permissions, then connect again.',
      });
    }

    // Apply the connection to every Google campaign in the admin's branch, so
    // the account only has to be authorised once.
    const { count } = await prisma.adCampaign.updateMany({
      where: { platform: 'GOOGLE', branchId: req.user?.branchId || undefined },
      data: { googleRefreshToken: tokens.refresh_token },
    });

    // Which accounts this login can actually reach - lets the admin copy the
    // right customer ID onto the campaign instead of guessing.
    const customers = await listGoogleCustomers(tokens.refresh_token);

    // The token itself is deliberately NOT returned. The previous version sent
    // accessToken and refreshToken back to the browser, putting long-lived ad
    // account credentials in JS memory and any response log.
    res.json({
      success: true,
      data: {
        message: 'Google account connected successfully',
        campaignsUpdated: count,
        accessibleCustomerIds: customers,
      },
    });
  } catch (error) {
    console.error('Google account callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect Google account',
    });
  }
};

export const getMetaAccountAuthUrl = async (req, res) => {
  try {
    // Admins may connect Meta on behalf of any branch; everyone else connects
    // their own. The branch and user travel in the signed state so the callback
    // cannot be replayed into a different branch or by a different user.
    const branchId =
      req.user.role === 'ADMIN' && req.query.branchId ? req.query.branchId : req.user.branchId;

    const authUrl = buildMetaAuthUrl(
      signState({ scope: 'account', branchId, userId: req.user.id })
    );
    res.json({ success: true, data: { url: authUrl, authUrl } });
  } catch (error) {
    console.error('Get Meta account auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Meta auth URL',
    });
  }
};

export const metaAccountCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    const payload = verifyState(state);
    if (!payload || (payload.userId && payload.userId !== req.user.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired authorization state. Start the connection again.',
      });
    }

    const branchId = payload.branchId || req.user.branchId;

    const shortLived = await exchangeMetaCode(code);
    const longLived = await exchangeMetaLongLivedToken(shortLived.access_token);

    const { connection, pages, adAccounts } = await saveMetaConnection({
      branchId,
      userToken: longLived.access_token,
      connectedBy: req.user.id,
    });

    // Keep older campaign rows working until everything reads the connection.
    const { count } = await prisma.adCampaign.updateMany({
      where: { platform: 'META', branchId },
      data: { metaAccessToken: longLived.access_token },
    });

    res.json({
      success: true,
      data: {
        message: pages.length
          ? `Meta account connected - ${pages.filter(p => p.subscribed).length} of ${pages.length} Page(s) will now send leads automatically`
          : 'Meta account connected, but no Facebook Pages were shared. Reconnect and tick your Page to import leads.',
        campaignsUpdated: count,
        longLived: longLived.long_lived,
        expiresAt: connection.expiresAt,
        pages: pages.map(p => ({
          pageId: p.pageId,
          name: p.name,
          subscribed: p.subscribed,
          error: p.subscribeError,
        })),
        adAccounts,
      },
    });
  } catch (error) {
    console.error('Meta account callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect Meta account',
    });
  }
};

// ============================================
// Connection status - lets the UI show "reconnect needed" before a sync fails
// ============================================
export const getConnectionStatus = async (req, res) => {
  try {
    const branchId = req.user?.branchId || undefined;

    const [googleCampaign, metaConnection] = await Promise.all([
      prisma.adCampaign.findFirst({
        where: { platform: 'GOOGLE', branchId, googleRefreshToken: { not: null } },
        select: { googleRefreshToken: true },
      }),
      branchId ? prisma.metaConnection.findUnique({ where: { branchId } }) : null,
    ]);

    const metaToken = metaConnection
      ? await inspectMetaToken(metaConnection.accessToken)
      : { valid: false };

    res.json({
      success: true,
      data: {
        google: {
          connected: Boolean(googleCampaign),
          developerTokenConfigured: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
        },
        meta: {
          connected: Boolean(metaConnection),
          tokenValid: metaToken.valid,
          expiresAt: metaToken.expiresAt ?? null,
        },
      },
    });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({ success: false, error: 'Failed to read connection status' });
  }
};

// ============================================
// Meta connection details - who is connected, which Pages send leads
// ============================================
const metaBranchId = req =>
  req.user.role === 'ADMIN' && req.query.branchId ? req.query.branchId : req.user.branchId;

export const getMetaConnection = async (req, res) => {
  try {
    const connection = await prisma.metaConnection.findUnique({
      where: { branchId: metaBranchId(req) },
      include: {
        pages: {
          select: { pageId: true, name: true, subscribed: true, subscribeError: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!connection) {
      return res.json({ success: true, data: { connected: false } });
    }

    const token = await inspectMetaToken(connection.accessToken);

    // Tokens stay on the server - only what the UI needs goes to the browser.
    res.json({
      success: true,
      data: {
        connected: true,
        tokenValid: token.valid,
        userName: connection.metaUserName,
        expiresAt: connection.expiresAt,
        connectedAt: connection.updatedAt,
        pages: connection.pages,
        adAccounts: connection.adAccounts,
      },
    });
  } catch (error) {
    console.error('Get Meta connection error:', error);
    res.status(500).json({ success: false, error: 'Failed to read Meta connection' });
  }
};

export const resubscribeMetaPage = async (req, res) => {
  try {
    const page = await prisma.metaPage.findFirst({
      where: { pageId: req.params.pageId, branchId: metaBranchId(req) },
    });

    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    let subscribed = false;
    let subscribeError = null;
    try {
      subscribed = await subscribeMetaPage(page.pageId, page.accessToken);
    } catch (error) {
      subscribeError = error.message;
    }

    await prisma.metaPage.update({
      where: { id: page.id },
      data: { subscribed, subscribeError },
    });

    if (!subscribed) {
      return res.status(502).json({
        success: false,
        error: subscribeError || 'Meta did not confirm the subscription',
      });
    }

    res.json({ success: true, data: { message: `${page.name} will now send leads` } });
  } catch (error) {
    console.error('Resubscribe Meta page error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe Page' });
  }
};

export const disconnectMeta = async (req, res) => {
  try {
    const branchId = metaBranchId(req);
    const connection = await prisma.metaConnection.findUnique({
      where: { branchId },
      include: { pages: true },
    });

    if (!connection) {
      return res.json({ success: true, data: { message: 'Meta was not connected' } });
    }

    // Stop Meta sending leads here, and remove the app from their Facebook
    // account, before forgetting the tokens that let us do either.
    await Promise.all(connection.pages.map(p => unsubscribeMetaPage(p.pageId, p.accessToken)));
    await revokeMetaUserToken(connection.accessToken);

    await prisma.$transaction([
      prisma.metaConnection.delete({ where: { id: connection.id } }),
      prisma.adCampaign.updateMany({
        where: { platform: 'META', branchId },
        data: { metaAccessToken: null },
      }),
    ]);

    res.json({ success: true, data: { message: 'Meta account disconnected' } });
  } catch (error) {
    console.error('Disconnect Meta error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect Meta' });
  }
};
