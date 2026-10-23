import express from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

const SETTINGS_ID = 'singleton';

router.use(authenticate);

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// Anything but a full #RRGGBB hex is stored as null, so the PDF falls back to its default color.
const toColor = value => (typeof value === 'string' && HEX_COLOR.test(value.trim()) ? value.trim() : null);

const str = value => (typeof value === 'string' ? value.trim() : '');

// Keeps only well-formed sections: a title and/or non-empty points, each point
// { text, isDefault }. Also accepts the earlier { title, items: string[] } shape.
function toPdfTerms(value) {
  if (!value || typeof value !== 'object') return null;
  const sections = Array.isArray(value.sections)
    ? value.sections
        .map(section => {
          const rawPoints = Array.isArray(section?.points)
            ? section.points
            : Array.isArray(section?.items)
              ? section.items.map(text => ({ text, isDefault: true }))
              : [];
          return {
            title: str(section?.title),
            points: rawPoints
              .map(point => ({ text: str(point?.text), isDefault: !!point?.isDefault }))
              .filter(point => point.text),
          };
        })
        .filter(section => section.title || section.points.length)
    : [];
  return { sections, address: str(value.address) };
}

// Pairs like { label, value } — rows with neither filled in are dropped.
function toPairs(value, keys) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => Object.fromEntries(keys.map(key => [key, str(item?.[key])])))
    .filter(item => keys.some(key => item[key]));
}

// The structured Thank You page (see ThankYouPageContent on the frontend).
function toThankYou(value) {
  if (!value || typeof value !== 'object') return undefined;
  return {
    showLogo: !!value.showLogo,
    logoUrl: str(value.logoUrl),
    title: str(value.title),
    message: str(value.message),
    promiseTitle: str(value.promiseTitle),
    promiseItems: Array.isArray(value.promiseItems) ? value.promiseItems.map(str).filter(Boolean) : [],
    preparedByName: str(value.preparedByName),
    preparedBySubtitle: str(value.preparedBySubtitle),
    contacts: toPairs(value.contacts, ['label', 'value']),
    socials: toPairs(value.socials, ['label', 'url']),
    accentColor: toColor(value.accentColor) || '',
  };
}

function toResponse(settings) {
  // footerItems is the source of truth once set. Before that (or for a
  // singleton row created before this field existed), fall back to the old
  // fixed phone/email/website columns so nothing already configured is lost.
  const footerItems = Array.isArray(settings?.footerItems)
    ? settings.footerItems
    : [settings?.footerPhone, settings?.footerEmail, settings?.footerWebsite].filter(Boolean);

  return {
    coverImage: settings?.itineraryCoverImage || null,
    terms: settings?.pdfTerms || null,
    footer: {
      items: footerItems,
      backgroundColor: settings?.footerBgColor || '',
      textColor: settings?.footerTextColor || '',
    },
    coverFooter: {
      companyName: settings?.coverFooterCompanyName || '',
      tagline: settings?.coverFooterTagline || '',
      cin: settings?.coverFooterCin || '',
      gst: settings?.coverFooterGst || '',
      phone: settings?.coverFooterPhone || '',
      bannerColor: settings?.coverFooterBannerColor || '',
      bannerTextColor: settings?.coverFooterBannerTextColor || '',
      detailsColor: settings?.coverFooterDetailsColor || '',
      detailsTextColor: settings?.coverFooterDetailsTextColor || '',
    },
    customLastPage: settings?.customLastPage || { enabled: false },
  };
}

// Read is open to anyone signed in — every itinerary's PDF needs these values,
// not just admins.
router.get('/pdf', async (req, res) => {
  try {
    const settings = await prisma.appSetting.findUnique({ where: { id: SETTINGS_ID } });
    res.json({ success: true, data: toResponse(settings) });
  } catch (error) {
    console.error('[Settings] Get PDF settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to load PDF settings' });
  }
});

// Writing changes every itinerary's PDF at once, so it is its own grant rather
// than something that comes with itinerary access.
router.patch(
  '/pdf',
  requirePermission('pdf_settings'),
  async (req, res) => {
    try {
      const { coverImage, terms, footer, coverFooter, customLastPage } = req.body;
      const data = {};
      if (coverImage !== undefined) data.itineraryCoverImage = coverImage || null;
      // null resets the PDF to its bundled default terms.
      if (terms !== undefined) data.pdfTerms = toPdfTerms(terms) ?? Prisma.DbNull;
      if (footer !== undefined) {
        data.footerItems = Array.isArray(footer?.items)
          ? footer.items.filter(item => typeof item === 'string' && item.trim())
          : [];
        if (footer?.backgroundColor !== undefined) data.footerBgColor = toColor(footer.backgroundColor);
        if (footer?.textColor !== undefined) data.footerTextColor = toColor(footer.textColor);
      }
      if (coverFooter !== undefined) {
        data.coverFooterCompanyName = coverFooter?.companyName || null;
        data.coverFooterTagline = coverFooter?.tagline || null;
        data.coverFooterCin = coverFooter?.cin || null;
        data.coverFooterGst = coverFooter?.gst || null;
        data.coverFooterPhone = coverFooter?.phone || null;
        if (coverFooter?.bannerColor !== undefined) {
          data.coverFooterBannerColor = toColor(coverFooter.bannerColor);
        }
        if (coverFooter?.bannerTextColor !== undefined) {
          data.coverFooterBannerTextColor = toColor(coverFooter.bannerTextColor);
        }
        if (coverFooter?.detailsColor !== undefined) {
          data.coverFooterDetailsColor = toColor(coverFooter.detailsColor);
        }
        if (coverFooter?.detailsTextColor !== undefined) {
          data.coverFooterDetailsTextColor = toColor(coverFooter.detailsTextColor);
        }
      }
      if (customLastPage !== undefined) {
        data.customLastPage = customLastPage
          ? {
              enabled: !!customLastPage.enabled,
              layout: customLastPage.layout === 'thankYou' ? 'thankYou' : 'image',
              thankYou: toThankYou(customLastPage.thankYou),
              imageUrl: str(customLastPage.imageUrl),
              text: str(customLastPage.text),
              facebookUrl: str(customLastPage.facebookUrl),
              instagramUrl: str(customLastPage.instagramUrl),
              websiteUrl: str(customLastPage.websiteUrl),
            }
          : null;
      }

      const settings = await prisma.appSetting.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...data },
        update: data,
      });
      res.json({ success: true, data: toResponse(settings) });
    } catch (error) {
      console.error('[Settings] Update PDF settings error:', error);
      res.status(500).json({ success: false, error: 'Failed to update PDF settings' });
    }
  }
);

export default router;
