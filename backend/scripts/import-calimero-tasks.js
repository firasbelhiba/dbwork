const mongoose = require('mongoose');
require('dotenv').config();

// User mapping
const userMapping = {
  'Hatem': '690b471dab322a5509315c26',
  'Firas': '68f979aa2ae284487d1dacca',
  'Farouk': '692eaa47d10bf24712d2edbb',
  'Nourey': '6930318229f6701ff75bb5c3', // Malek Nouri
  'Hamza': '6930337f29f6701ff75bb82e',
  'Ismail': '6930332629f6701ff75bb7c0',
  'Farah': '6938004468ecdf6c2f6f90e0',
  // Yacine and Souleima - no assignee
};

// Category mapping
const categoryMapping = {
  'WEBSITE': 'frontend',
  'SOCIAL_MEDIA': 'marketing',
  'COMMUNITY_CAMPAIGN': 'marketing',
  'INFLUENCERS_MEMES': 'marketing',
  'PAID_ADS_PR': 'marketing',
  'AI_APP': 'backend',
  'ECOMMERCE': 'backend',
};

// Project and reporter IDs
const PROJECT_ID = '6937ff1d68ecdf6c2f6f8a4b';
const REPORTER_ID = '68f979aa2ae284487d1dacca'; // Firas

// Parse date from DD/MM/YYYY format
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}`);
}

// Get assignee IDs from responsible string
function getAssignees(responsibleStr) {
  if (!responsibleStr) return [];

  const names = responsibleStr.split('/').map(n => n.trim());
  const assignees = [];

  for (const name of names) {
    if (userMapping[name]) {
      assignees.push(new mongoose.Types.ObjectId(userMapping[name]));
    }
    // Skip Yacine and Souleima (not in DB)
  }

  return assignees;
}

// Tasks data from Excel
const tasks = [
  { id: 'W001', category: 'WEBSITE', title: 'Infra hosting setup (99.9% uptime)', responsible: 'Hatem/Firas', start: '07/12/2025', end: '15/12/2025', label: '', notes: '' },
  { id: 'W002', category: 'WEBSITE', title: 'Domain + SSL/TLS', responsible: 'Hatem/Firas', start: '07/12/2025', end: '08/12/2025', label: '', notes: '' },
  { id: 'W003', category: 'WEBSITE', title: 'CMS selection & setup', responsible: 'Hatem/Firas', start: '08/12/2025', end: '15/12/2025', label: '', notes: '' },
  { id: 'W004', category: 'WEBSITE', title: 'Homepage design', responsible: 'Farouk/Yacine', start: '07/12/2025', end: '20/12/2025', label: '', notes: '' },
  { id: 'W005', category: 'WEBSITE', title: 'About Calimero page', responsible: 'Farouk/Yacine', start: '20/12/2025', end: '27/12/2025', label: '', notes: '' },
  { id: 'W006', category: 'WEBSITE', title: 'Watch Clips Library (design)', responsible: 'Farouk/Yacine', start: '27/12/2025', end: '10/01/2026', label: '', notes: '' },
  { id: 'W007', category: 'WEBSITE', title: 'AI Portal (Talk to Calimero)', responsible: 'Nourey/Hatem', start: '10/01/2026', end: '20/01/2026', label: '', notes: 'API integration pending' },
  { id: 'W008', category: 'WEBSITE', title: 'Merchandise Store design', responsible: 'Farouk/Yacine', start: '20/01/2026', end: '31/01/2026', label: '', notes: 'Catalogue eCommerce' },
  { id: 'W009', category: 'WEBSITE', title: 'Community Hub page', responsible: 'Farouk/Yacine', start: '31/01/2026', end: '07/02/2026', label: '', notes: 'UGC data' },
  { id: 'W010', category: 'WEBSITE', title: 'Memes Gallery page', responsible: 'Farouk/Yacine', start: '31/01/2026', end: '07/02/2026', label: '', notes: '' },
  { id: 'W011', category: 'WEBSITE', title: '5 Easter eggs implementation', responsible: 'Hamza', start: '15/01/2026', end: '31/01/2026', label: '', notes: '' },
  { id: 'W012', category: 'WEBSITE', title: 'Multilingual setup (4 languages)', responsible: 'Hatem/Firas', start: '01/01/2026', end: '15/01/2026', label: '', notes: '' },
  { id: 'W013', category: 'WEBSITE', title: 'WCAG 2.1 AA accessibility audit', responsible: 'Hatem/Nourey', start: '15/01/2026', end: '22/01/2026', label: '', notes: '' },
  { id: 'W014', category: 'WEBSITE', title: 'GA4 + analytics integration', responsible: 'Hatem/Firas', start: '01/01/2026', end: '15/01/2026', label: '', notes: '' },
  { id: 'W015', category: 'WEBSITE', title: 'Payment gateway integration (2 min)', responsible: 'Hatem/Firas', start: '15/01/2026', end: '31/01/2026', label: '', notes: 'PCI DSS compliance' },
  { id: 'W016', category: 'WEBSITE', title: 'Daily backup system (30-day retention)', responsible: 'Hatem/Firas', start: '15/12/2025', end: '22/12/2025', label: '', notes: '' },
  { id: 'W017', category: 'WEBSITE', title: 'SEO foundations (meta/schema/sitemap)', responsible: 'Hatem/Nourey', start: '15/12/2025', end: '31/12/2025', label: '', notes: '' },
  { id: 'W018', category: 'WEBSITE', title: 'Performance optimization (3s load)', responsible: 'Hatem/Firas', start: '15/01/2026', end: '31/01/2026', label: '', notes: '' },
  { id: 'W019', category: 'WEBSITE', title: 'Admin panel development', responsible: 'Hatem/Firas', start: '22/12/2025', end: '07/01/2026', label: '', notes: '' },
  { id: 'W020', category: 'WEBSITE', title: 'Website testing & QA', responsible: 'Hatem', start: '31/01/2026', end: '07/02/2026', label: '', notes: '' },
  { id: 'S001', category: 'SOCIAL_MEDIA', title: '30+ page social strategy', responsible: 'Ismail/Farah/Hatem/Souleima', start: '07/12/2025', end: '15/12/2025', label: 'Global', notes: '' },
  { id: 'S002', category: 'SOCIAL_MEDIA', title: 'Brand voice & tone guide', responsible: 'Ismail/Farah/Souleima', start: '07/12/2025', end: '15/12/2025', label: 'Global', notes: '' },
  { id: 'S003', category: 'SOCIAL_MEDIA', title: 'Instagram account creation & optimization', responsible: 'Nourey/Souleima', start: '15/12/2025', end: '22/12/2025', label: 'Instagram', notes: '' },
  { id: 'S004', category: 'SOCIAL_MEDIA', title: 'TikTok account creation & optimization', responsible: 'Hamza/Souleima', start: '15/12/2025', end: '22/12/2025', label: 'TikTok', notes: '' },
  { id: 'S005', category: 'SOCIAL_MEDIA', title: 'Twitter/X account creation & optimization', responsible: 'Ismail/Souleima', start: '15/12/2025', end: '22/12/2025', label: 'Twitter/X', notes: '' },
  { id: 'S006', category: 'SOCIAL_MEDIA', title: 'YouTube Shorts channel setup', responsible: 'Hamza/Souleima', start: '15/12/2025', end: '22/12/2025', label: 'YouTube', notes: '' },
  { id: 'S007', category: 'SOCIAL_MEDIA', title: 'Community guidelines document', responsible: 'Ismail/Souleima', start: '15/12/2025', end: '22/12/2025', label: 'Global', notes: '' },
  { id: 'S008', category: 'SOCIAL_MEDIA', title: '3-month editorial calendar (45+ posts)', responsible: 'Ismail/Farah/Souleima', start: '22/12/2025', end: '31/12/2025', label: 'Global', notes: '' },
  { id: 'S009', category: 'SOCIAL_MEDIA', title: '12+ teaser content creation', responsible: 'Nourey/Hamza', start: '22/12/2025', end: '31/12/2025', label: 'Global', notes: '' },
  { id: 'S010', category: 'SOCIAL_MEDIA', title: 'UGC curation framework', responsible: 'Ismail/Souleima', start: '22/12/2025', end: '31/12/2025', label: 'Global', notes: '' },
  { id: 'S011', category: 'SOCIAL_MEDIA', title: 'Hashtag ecosystem (brand/campaign/trending)', responsible: 'Ismail/Souleima', start: '22/12/2025', end: '31/12/2025', label: 'Global', notes: '' },
  { id: 'S012', category: 'SOCIAL_MEDIA', title: 'Instagram posting (4/week + daily Stories)', responsible: 'Souleima', start: '08/01/2026', end: '07/03/2026', label: 'Instagram', notes: '' },
  { id: 'S013', category: 'SOCIAL_MEDIA', title: 'TikTok posting (5 videos/week)', responsible: 'Hamza/Souleima', start: '08/01/2026', end: '07/03/2026', label: 'TikTok', notes: '' },
  { id: 'S014', category: 'SOCIAL_MEDIA', title: 'Twitter/X posting (6 posts/week)', responsible: 'Ismail/Souleima', start: '08/01/2026', end: '07/03/2026', label: 'Twitter/X', notes: '' },
  { id: 'S015', category: 'SOCIAL_MEDIA', title: 'YouTube Shorts (3 videos/week)', responsible: 'Hamza/Souleima', start: '08/01/2026', end: '07/03/2026', label: 'YouTube', notes: '' },
  { id: 'S016', category: 'SOCIAL_MEDIA', title: 'Monthly performance analysis', responsible: 'Ismail/Farah', start: '31/12/2025', end: '07/01/2026', label: 'Global', notes: '' },
  { id: 'S017', category: 'SOCIAL_MEDIA', title: 'Monthly performance analysis M2', responsible: 'Ismail/Farah', start: '31/01/2026', end: '07/02/2026', label: 'Global', notes: '' },
  { id: 'S018', category: 'SOCIAL_MEDIA', title: 'Monthly performance analysis M3', responsible: 'Ismail/Farah', start: '28/02/2026', end: '07/03/2026', label: 'Global', notes: '' },
  { id: 'C001', category: 'COMMUNITY_CAMPAIGN', title: 'Daily community management setup', responsible: 'Ismail/Souleima', start: '07/12/2025', end: '15/12/2025', label: 'Community', notes: '' },
  { id: 'C002', category: 'COMMUNITY_CAMPAIGN', title: '#ItsNotFair campaign strategy', responsible: 'Ismail/Souleima/Nourey', start: '15/01/2026', end: '31/01/2026', label: 'Campaign', notes: '' },
  { id: 'C003', category: 'COMMUNITY_CAMPAIGN', title: '20+ creative assets (visuals/templates)', responsible: 'Farouk/Yacine', start: '01/02/2026', end: '15/02/2026', label: 'Campaign', notes: '' },
  { id: 'C004', category: 'COMMUNITY_CAMPAIGN', title: 'Meme contest system design', responsible: 'Ismail/Souleima', start: '01/02/2026', end: '15/02/2026', label: 'Campaign', notes: '' },
  { id: 'C005', category: 'COMMUNITY_CAMPAIGN', title: 'Submission workflow setup', responsible: 'Ismail/Hatem', start: '01/02/2026', end: '15/02/2026', label: 'Campaign', notes: '' },
  { id: 'C006', category: 'COMMUNITY_CAMPAIGN', title: 'Contest judging framework', responsible: 'Ismail/Souleima', start: '15/02/2026', end: '22/02/2026', label: 'Campaign', notes: '' },
  { id: 'C007', category: 'COMMUNITY_CAMPAIGN', title: 'Leaderboard design & implementation', responsible: 'Farouk/Yacine', start: '15/02/2026', end: '28/02/2026', label: 'Campaign', notes: '' },
  { id: 'C008', category: 'COMMUNITY_CAMPAIGN', title: 'Campaign tracking dashboard', responsible: 'Ismail/Farah', start: '22/02/2026', end: '07/03/2026', label: 'Campaign', notes: '' },
  { id: 'C009', category: 'COMMUNITY_CAMPAIGN', title: 'Reddit micro-community r/Calimero', responsible: 'Ismail/Souleima', start: '07/01/2026', end: '31/01/2026', label: 'Community', notes: '' },
  { id: 'C010', category: 'COMMUNITY_CAMPAIGN', title: 'Reddit micro-community r/CalimeroMemes', responsible: 'Ismail/Souleima', start: '07/01/2026', end: '31/01/2026', label: 'Community', notes: '' },
  { id: 'C011', category: 'COMMUNITY_CAMPAIGN', title: 'Weekly 9gag submissions', responsible: 'Souleima/Hamza', start: '08/01/2026', end: '07/03/2026', label: 'Community', notes: '' },
  { id: 'C012', category: 'COMMUNITY_CAMPAIGN', title: 'Daily community moderation (8am-6pm CET)', responsible: 'Souleima', start: '08/01/2026', end: '07/03/2026', label: 'Community', notes: '' },
  { id: 'C013', category: 'COMMUNITY_CAMPAIGN', title: 'Minimum 50 interactions/month tracking', responsible: 'Ismail/Souleima', start: '31/12/2025', end: '07/01/2026', label: 'Community', notes: '' },
  { id: 'C014', category: 'COMMUNITY_CAMPAIGN', title: 'Interaction tracking M2', responsible: 'Ismail/Souleima', start: '31/01/2026', end: '07/02/2026', label: 'Community', notes: '' },
  { id: 'C015', category: 'COMMUNITY_CAMPAIGN', title: 'Interaction tracking M3', responsible: 'Ismail/Souleima', start: '28/02/2026', end: '07/03/2026', label: 'Community', notes: '' },
  { id: 'I001', category: 'INFLUENCERS_MEMES', title: '100+ micro-influencers mapping EU', responsible: 'Farah/Hatem/Souleima', start: '07/12/2025', end: '31/12/2025', label: 'Influencers', notes: '' },
  { id: 'I002', category: 'INFLUENCERS_MEMES', title: '50+ meme pages mapping', responsible: 'Farah/Hatem/Souleima', start: '07/12/2025', end: '31/12/2025', label: 'Memes', notes: '' },
  { id: 'I003', category: 'INFLUENCERS_MEMES', title: 'Influencer partnership negotiations', responsible: 'Farah/Hatem/Souleima', start: '01/01/2026', end: '31/01/2026', label: 'Influencers', notes: '' },
  { id: 'I004', category: 'INFLUENCERS_MEMES', title: '20+ influencer partnerships finalized', responsible: 'Farah/Souleima', start: '31/01/2026', end: '07/02/2026', label: 'Influencers', notes: '' },
  { id: 'I005', category: 'INFLUENCERS_MEMES', title: 'Meme page partnership negotiations', responsible: 'Farah/Hatem/Souleima', start: '01/02/2026', end: '15/02/2026', label: 'Memes', notes: '' },
  { id: 'I006', category: 'INFLUENCERS_MEMES', title: '10+ meme page partnerships finalized', responsible: 'Farah/Souleima', start: '15/02/2026', end: '28/02/2026', label: 'Memes', notes: '' },
  { id: 'I007', category: 'INFLUENCERS_MEMES', title: '10 co-created viral content formats', responsible: 'Nourey/Hamza', start: '15/01/2026', end: '07/02/2026', label: 'Content', notes: 'Partner input' },
  { id: 'I008', category: 'INFLUENCERS_MEMES', title: 'Creator drop calendar (2 months)', responsible: 'Farah/Souleima', start: '01/02/2026', end: '07/03/2026', label: 'Planning', notes: '' },
  { id: 'I009', category: 'INFLUENCERS_MEMES', title: 'Influencer analytics dashboard', responsible: 'Farah/Hatem', start: '15/02/2026', end: '28/02/2026', label: 'Reporting', notes: '' },
  { id: 'I010', category: 'INFLUENCERS_MEMES', title: 'Monthly influencer report M1', responsible: 'Farah/Souleima', start: '31/12/2025', end: '07/01/2026', label: 'Reporting', notes: '' },
  { id: 'I011', category: 'INFLUENCERS_MEMES', title: 'Monthly influencer report M2', responsible: 'Farah/Souleima', start: '31/01/2026', end: '07/02/2026', label: 'Reporting', notes: '' },
  { id: 'I012', category: 'INFLUENCERS_MEMES', title: 'Monthly influencer report M3', responsible: 'Farah/Souleima', start: '28/02/2026', end: '07/03/2026', label: 'Reporting', notes: '' },
  { id: 'P001', category: 'PAID_ADS_PR', title: 'Complete ad strategy (Meta/TikTok/YouTube)', responsible: 'Farah/Souleima', start: '07/12/2025', end: '22/12/2025', label: 'Ads', notes: '' },
  { id: 'P002', category: 'PAID_ADS_PR', title: 'Audience segmentation & lookalike models', responsible: 'Farah/Souleima', start: '22/12/2025', end: '31/12/2025', label: 'Ads', notes: '' },
  { id: 'P003', category: 'PAID_ADS_PR', title: 'Pixel setup & tracking implementation', responsible: 'Farah/Hatem', start: '07/12/2025', end: '22/12/2025', label: 'Ads', notes: '' },
  { id: 'P004', category: 'PAID_ADS_PR', title: '15 Meta ad creatives', responsible: 'Farouk/Yacine', start: '22/12/2025', end: '15/01/2026', label: 'Ads', notes: '' },
  { id: 'P005', category: 'PAID_ADS_PR', title: '15 TikTok ad creatives', responsible: 'Farouk/Yacine', start: '22/12/2025', end: '15/01/2026', label: 'Ads', notes: '' },
  { id: 'P006', category: 'PAID_ADS_PR', title: '15 YouTube ad creatives', responsible: 'Farouk/Yacine', start: '22/12/2025', end: '15/01/2026', label: 'Ads', notes: '' },
  { id: 'P007', category: 'PAID_ADS_PR', title: 'Retargeting flows setup', responsible: 'Farah/Hatem', start: '15/01/2026', end: '22/01/2026', label: 'Ads', notes: '' },
  { id: 'P008', category: 'PAID_ADS_PR', title: 'Ads go live (Meta/TikTok/YouTube)', responsible: 'Farah/Souleima', start: '08/01/2026', end: '15/01/2026', label: 'Ads', notes: '' },
  { id: 'P009', category: 'PAID_ADS_PR', title: 'Weekly ad optimization', responsible: 'Farah/Souleima', start: '15/01/2026', end: '07/03/2026', label: 'Ads', notes: '' },
  { id: 'P010', category: 'PAID_ADS_PR', title: 'Monthly ad performance report', responsible: 'Farah/Souleima', start: '31/12/2025', end: '07/01/2026', label: 'Reporting', notes: '' },
  { id: 'P011', category: 'PAID_ADS_PR', title: 'Monthly ad performance report M2', responsible: 'Farah/Souleima', start: '31/01/2026', end: '07/02/2026', label: 'Reporting', notes: '' },
  { id: 'P012', category: 'PAID_ADS_PR', title: 'Monthly ad performance report M3', responsible: 'Farah/Souleima', start: '28/02/2026', end: '07/03/2026', label: 'Reporting', notes: '' },
  { id: 'P013', category: 'PAID_ADS_PR', title: 'PR strategy document', responsible: 'Ismail/Farah', start: '07/12/2025', end: '22/12/2025', label: 'PR', notes: '' },
  { id: 'P014', category: 'PAID_ADS_PR', title: '3 press releases drafted', responsible: 'Ismail/Farah', start: '22/12/2025', end: '31/01/2026', label: 'PR', notes: '' },
  { id: 'P015', category: 'PAID_ADS_PR', title: 'Media outreach (50 outlets)', responsible: 'Farah/Souleima', start: '07/12/2025', end: '31/01/2026', label: 'PR', notes: '' },
  { id: 'P016', category: 'PAID_ADS_PR', title: '2 long-form interviews (1500+ words)', responsible: 'Ismail', start: '01/01/2026', end: '31/01/2026', label: 'PR', notes: '' },
  { id: 'P017', category: 'PAID_ADS_PR', title: 'Full media kit creation', responsible: 'Nourey/Ismail', start: '15/01/2026', end: '31/01/2026', label: 'PR', notes: '' },
  { id: 'P018', category: 'PAID_ADS_PR', title: 'Monthly media & buzz report', responsible: 'Ismail/Farah', start: '31/12/2025', end: '07/01/2026', label: 'Reporting', notes: '' },
  { id: 'A001', category: 'AI_APP', title: 'AI App UX/UI design (iOS/Android)', responsible: 'Farouk/Yacine', start: '07/12/2025', end: '15/01/2026', label: 'Both', notes: '' },
  { id: 'A002', category: 'AI_APP', title: 'Emotional dialogue engine development', responsible: 'Hatem/Firas', start: '15/12/2025', end: '15/01/2026', label: 'Backend', notes: '' },
  { id: 'A003', category: 'AI_APP', title: '20 original bedtime stories creation', responsible: 'Hamza', start: '22/12/2025', end: '31/01/2026', label: 'Content', notes: '' },
  { id: 'A004', category: 'AI_APP', title: 'Text-to-Speech (TTS) integration', responsible: 'Hatem/Firas', start: '15/01/2026', end: '22/01/2026', label: 'Backend', notes: '' },
  { id: 'A005', category: 'AI_APP', title: 'Speech-to-Text (STT) integration', responsible: 'Hatem/Firas', start: '15/01/2026', end: '22/01/2026', label: 'Backend', notes: '' },
  { id: 'A006', category: 'AI_APP', title: 'Gamification system (25+ badges)', responsible: 'Hatem/Firas', start: '22/01/2026', end: '31/01/2026', label: 'Backend', notes: '' },
  { id: 'A007', category: 'AI_APP', title: 'Daily streaks feature', responsible: 'Hatem/Firas', start: '22/01/2026', end: '31/01/2026', label: 'Backend', notes: '' },
  { id: 'A008', category: 'AI_APP', title: 'Voice pack marketplace (5+ variations)', responsible: 'Hatem/Firas', start: '31/01/2026', end: '07/02/2026', label: 'Backend', notes: '' },
  { id: 'A009', category: 'AI_APP', title: 'Rewards system (convertible to discounts)', responsible: 'Hatem/Firas', start: '31/01/2026', end: '07/02/2026', label: 'Backend', notes: '' },
  { id: 'A010', category: 'AI_APP', title: 'Parental controls setup', responsible: 'Hatem/Firas', start: '01/02/2026', end: '15/02/2026', label: 'Backend', notes: 'COPPA compliance' },
  { id: 'A011', category: 'AI_APP', title: 'Screen time limits implementation', responsible: 'Hatem/Firas', start: '01/02/2026', end: '08/02/2026', label: 'Backend', notes: '' },
  { id: 'A012', category: 'AI_APP', title: 'Age-appropriate content filters', responsible: 'Hatem/Firas', start: '08/02/2026', end: '15/02/2026', label: 'Backend', notes: '' },
  { id: 'A013', category: 'AI_APP', title: 'GDPR privacy framework', responsible: 'Hatem/Ismail', start: '22/12/2025', end: '31/12/2025', label: 'Compliance', notes: '' },
  { id: 'A014', category: 'AI_APP', title: 'COPPA compliance setup', responsible: 'Hatem/Ismail', start: '22/12/2025', end: '31/12/2025', label: 'Compliance', notes: '' },
  { id: 'A015', category: 'AI_APP', title: 'Consent flows & DSAR fulfillment', responsible: 'Hatem/Firas', start: '31/12/2025', end: '15/01/2026', label: 'Compliance', notes: '' },
  { id: 'A016', category: 'AI_APP', title: 'End-to-End encryption implementation', responsible: 'Hatem/Firas', start: '15/01/2026', end: '31/01/2026', label: 'Security', notes: '' },
  { id: 'A017', category: 'AI_APP', title: 'Cloud auto-scaling infrastructure', responsible: 'Hatem/Firas', start: '07/12/2025', end: '22/12/2025', label: 'Infrastructure', notes: '' },
  { id: 'A018', category: 'AI_APP', title: 'API rate limiting & monitoring', responsible: 'Hatem/Firas', start: '22/12/2025', end: '31/12/2025', label: 'Infrastructure', notes: '' },
  { id: 'A019', category: 'AI_APP', title: 'Daily backup system setup', responsible: 'Hatem/Firas', start: '22/12/2025', end: '31/12/2025', label: 'Infrastructure', notes: '' },
  { id: 'A020', category: 'AI_APP', title: 'Crash reporting integration', responsible: 'Hatem/Firas', start: '31/12/2025', end: '15/01/2026', label: 'Infrastructure', notes: '' },
  { id: 'A021', category: 'AI_APP', title: '50+ test cases development', responsible: 'Hatem', start: '15/01/2026', end: '31/01/2026', label: 'QA', notes: '' },
  { id: 'A022', category: 'AI_APP', title: '1000-user beta program (12 weeks)', responsible: 'Hatem/Firas', start: '01/02/2026', end: '28/04/2026', label: 'Testing', notes: '' },
  { id: 'A023', category: 'AI_APP', title: 'Device testing (10+ devices)', responsible: 'Hatem', start: '15/01/2026', end: '31/01/2026', label: 'QA', notes: '' },
  { id: 'A024', category: 'AI_APP', title: 'Accessibility testing (WCAG 2.1 AA)', responsible: 'Hatem/Nourey', start: '15/01/2026', end: '31/01/2026', label: 'QA', notes: '' },
  { id: 'A025', category: 'AI_APP', title: 'Offline/low bandwidth testing', responsible: 'Hatem', start: '22/01/2026', end: '31/01/2026', label: 'QA', notes: '' },
  { id: 'A026', category: 'AI_APP', title: 'iOS app development & submission', responsible: 'Hatem/Firas', start: '15/12/2025', end: '07/02/2026', label: 'iOS', notes: 'Apple approval' },
  { id: 'A027', category: 'AI_APP', title: 'Android app development & submission', responsible: 'Hatem/Firas', start: '15/12/2025', end: '07/02/2026', label: 'Android', notes: 'Google approval' },
  { id: 'E001', category: 'ECOMMERCE', title: 'eCommerce strategy & product mix', responsible: 'Farah/Nourey', start: '07/12/2025', end: '22/12/2025', label: 'Planning', notes: '' },
  { id: 'E002', category: 'ECOMMERCE', title: '50+ SKU product catalog creation', responsible: 'Nourey/Farah', start: '15/01/2026', end: '07/02/2026', label: 'Product', notes: '' },
  { id: 'E003', category: 'ECOMMERCE', title: 'Website eCommerce integration', responsible: 'Hatem/Firas', start: '15/01/2026', end: '31/01/2026', label: 'Website', notes: 'Website launch' },
  { id: 'E004', category: 'ECOMMERCE', title: 'Mobile checkout flow (app)', responsible: 'Hatem/Firas', start: '08/01/2026', end: '31/01/2026', label: 'App', notes: '' },
  { id: 'E005', category: 'ECOMMERCE', title: 'Payment gateway integration (2 min)', responsible: 'Hatem/Firas', start: '15/01/2026', end: '31/01/2026', label: 'Payments', notes: 'PCI DSS' },
  { id: 'E006', category: 'ECOMMERCE', title: 'Discount/promo system setup', responsible: 'Hatem/Firas', start: '01/02/2026', end: '15/02/2026', label: 'Features', notes: '' },
  { id: 'E007', category: 'ECOMMERCE', title: 'Order tracking system', responsible: 'Hatem/Firas', start: '01/02/2026', end: '15/02/2026', label: 'Features', notes: '' },
  { id: 'E008', category: 'ECOMMERCE', title: 'Customer support interface', responsible: 'Ismail/Hatem', start: '15/02/2026', end: '28/02/2026', label: 'Support', notes: '' },
  { id: 'E009', category: 'ECOMMERCE', title: 'Conversion analytics dashboard', responsible: 'Farah/Hatem', start: '22/02/2026', end: '07/03/2026', label: 'Analytics', notes: '' },
  { id: 'E010', category: 'ECOMMERCE', title: 'Apparel products (20+ items)', responsible: 'Nourey/Farah', start: '15/01/2026', end: '31/01/2026', label: 'Product', notes: '' },
  { id: 'E011', category: 'ECOMMERCE', title: 'Accessories products (15+ items)', responsible: 'Nourey/Farah', start: '15/01/2026', end: '31/01/2026', label: 'Product', notes: '' },
  { id: 'E012', category: 'ECOMMERCE', title: 'Collectibles products (10+ items)', responsible: 'Nourey/Farah', start: '22/01/2026', end: '07/02/2026', label: 'Product', notes: '' },
  { id: 'E013', category: 'ECOMMERCE', title: 'Digital items (5+ products)', responsible: 'Hamza/Hatem', start: '01/02/2026', end: '15/02/2026', label: 'Digital', notes: '' },
  { id: 'E014', category: 'ECOMMERCE', title: 'Season drops planning & execution', responsible: 'Farah/Nourey', start: '15/02/2026', end: '28/02/2026', label: 'Planning', notes: '' },
  { id: 'E015', category: 'ECOMMERCE', title: 'Collaboration drops planning', responsible: 'Farah/Nourey', start: '22/02/2026', end: '07/03/2026', label: 'Planning', notes: 'Partner coordination' },
];

async function importTasks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const issuesCollection = mongoose.connection.db.collection('issues');

    // Get current max issue number for CALM project
    const existingIssues = await issuesCollection.find({ key: /^CALM-\d+$/ }).toArray();
    let maxNumber = 0;
    existingIssues.forEach(issue => {
      const match = issue.key.match(/CALM-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    console.log(`Starting issue number: ${maxNumber + 1}`);
    console.log(`Importing ${tasks.length} tasks...`);

    let created = 0;
    let errors = 0;

    for (const task of tasks) {
      try {
        maxNumber++;
        const issueKey = `CALM-${maxNumber}`;

        // Build labels array
        const labels = [task.id]; // Always include the original ID
        if (task.label) {
          labels.push(task.label);
        }

        // Build description
        let description = `Responsible: ${task.responsible}`;
        if (task.notes) {
          description += `\n\nNotes: ${task.notes}`;
        }
        description += `\n\nOriginal Category: ${task.category}`;
        description += `\nStart Date: ${task.start}`;

        const issue = {
          projectId: new mongoose.Types.ObjectId(PROJECT_ID),
          key: issueKey,
          title: task.title,
          description: description,
          type: 'task',
          priority: 'medium',
          status: 'todo',
          assignees: getAssignees(task.responsible),
          reporter: new mongoose.Types.ObjectId(REPORTER_ID),
          labels: labels,
          category: categoryMapping[task.category] || 'other',
          customFields: {},
          timeTracking: {
            estimatedHours: null,
            loggedHours: 0,
            timeLogs: [],
            timeEntries: [],
            activeTimeEntry: null,
            totalTimeSpent: 0,
          },
          attachments: [],
          sprintId: null,
          dueDate: parseDate(task.end),
          storyPoints: 0,
          watchers: [],
          blockedBy: [],
          blocks: [],
          parentIssue: null,
          order: 0,
          isArchived: false,
          archivedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await issuesCollection.insertOne(issue);
        created++;
        console.log(`✓ Created ${issueKey}: ${task.title}`);
      } catch (error) {
        errors++;
        console.error(`✗ Error creating ${task.id}: ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log(`Import complete!`);
    console.log(`Created: ${created} issues`);
    console.log(`Errors: ${errors}`);
    console.log('========================================');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

importTasks();
