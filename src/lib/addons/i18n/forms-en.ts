/**
 * English display text for every Tools Pro form in `PRO_FORMS` (keyed by tool id → field `name`).
 * Display-only: option `value`s, field `name`s and the Indonesian forms stay untouched (server validation & AI briefs use them).
 * Dynamic month options (e.g. "Oktober 2026") are translated by `monthLabelEn` in `index.ts`, so they are not listed here.
 * Client-safe.
 */

export interface FieldTextEn {
  label: string;
  hint?: string;
  placeholder?: string;
  /** option value → English label */
  options?: Record<string, string>;
  suffix?: string;
}

export interface FormTextEn {
  fields: Record<string, FieldTextEn>;
  /** Same length & order as `ToolForm.steps`. */
  steps: string[];
}

const PLATFORMS_EN: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube Shorts",
  linkedin: "LinkedIn",
  x: "X / Twitter",
};

/** Channel chips shared by plan / campaign / gtm. */
const CHANNELS_EN: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  meta_ads: "Meta Ads",
  tiktok_ads: "TikTok Ads",
  google_ads: "Google Ads / SEO",
  marketplace: "Marketplace (Shopee/Tokopedia/TikTok Shop)",
  whatsapp: "WhatsApp / CRM",
  kol: "KOL / Affiliate",
  website: "Website",
  pr: "PR / media",
  offline: "Store / offline events",
  b2b: "Direct sales / B2B",
};

export const FORMS_EN: Record<string, FormTextEn> = {
  // ------------------------------------------------ Content calendar
  calendar: {
    steps: [
      "Reading your brand & target buyers…",
      "Defining content pillars…",
      "Finding key moments & dates…",
      "Writing ideas, hooks & captions…",
      "Building the calendar & Excel file…",
    ],
    fields: {
      brand: { label: "Brand name *", placeholder: "e.g. Kopi Senja" },
      month: { label: "Month" },
      business: {
        label: "Product & target buyers *",
        placeholder:
          "e.g. Liter-size palm sugar iced milk coffee at Rp45k, sold on Shopee & TikTok Shop. Targeting 22–35 y/o workers in Greater Jakarta who drink coffee daily but want to save money.",
      },
      platforms: { label: "Platforms *", options: PLATFORMS_EN },
      goal: {
        label: "Main goal this month",
        options: {
          awareness: "Reach more people",
          engagement: "Engagement & community",
          sales: "Sales",
          launch: "Product/promo launch",
          education: "Market education",
        },
      },
      per_week: { label: "Posts per week (all platforms)" },
      tone: { label: "Brand tone of voice (optional)", placeholder: "e.g. casual, friendly, a bit playful" },
      resources: { label: "Production capacity (optional)", placeholder: "e.g. 1 person, phone only, no talent" },
      agenda: {
        label: "Promos / agenda that month (optional)",
        placeholder: "e.g. Payday sale on the 25th–28th, new variant launch on the 10th",
      },
    },
  },

  // ------------------------------------------------ Monthly report
  report: {
    steps: [
      "Reading your data & report files…",
      "Calculating KPIs vs targets & last month…",
      "Analyzing each channel…",
      "Drafting insights & next month's plan…",
      "Building the PPT & Excel…",
    ],
    fields: {
      brand: { label: "Brand / client *", placeholder: "e.g. Kopi Senja" },
      period: { label: "Report period *", placeholder: "e.g. September 2026" },
      attachment_ids: {
        label: "This month's data",
        hint: "Upload Ads Manager exports, Instagram/TikTok insights, marketplace sales reports, or dashboard screenshots. CSV, Excel, PDF, PNG/JPG — max 5 files.",
      },
      data: {
        label: "Or type the key numbers",
        hint: "Fill this if you have no files, or to add detail. Last month's numbers make the analysis sharper.",
        placeholder:
          "e.g. Revenue Rp84M (Aug Rp71M), 1,240 orders, Meta ad spend Rp12M ROAS 3.1x, TikTok Ads Rp5M ROAS 2.2x, IG followers +1,350, ER 3.8%",
      },
      targets: { label: "This month's targets (optional)", placeholder: "e.g. Revenue Rp90M, ROAS at least 3x, 1,500 orders" },
      channels: {
        label: "Channels to report *",
        options: {
          meta_ads: "Meta Ads",
          tiktok_ads: "TikTok Ads",
          google_ads: "Google Ads",
          marketplace: "Marketplace",
          instagram: "Instagram organic",
          tiktok: "TikTok organic",
          website: "Website",
          whatsapp: "WhatsApp / CRM",
          kol: "KOL / Affiliate",
          offline: "Store / offline",
        },
      },
      audience: {
        label: "Report for",
        options: { owner: "Owner / manager", client: "Client (agency report)", team: "Internal team" },
      },
      color: { label: "Brand color for the PPT (optional)", placeholder: "e.g. #E11D48" },
    },
  },

  // ------------------------------------------------ Marketing plan
  plan: {
    steps: [
      "Reading your business situation & targets…",
      "Building the situation analysis & SWOT…",
      "Setting SMART goals & positioning…",
      "Planning channel strategy & budget allocation…",
      "Creating the roadmap, KPIs & quick wins…",
      "Building the PPT & Excel…",
    ],
    fields: {
      brand: { label: "Brand name *", placeholder: "e.g. Kopi Senja" },
      period: {
        label: "Plan period",
        options: { "3": "3 months (quarter)", "6": "6 months", "12": "12 months (annual)" },
      },
      business: {
        label: "Business & current situation *",
        hint: "Products, price range, sales channels, and current numbers (revenue, orders/customers) if you have them — the more complete, the sharper the plan.",
        placeholder:
          "e.g. Liter-size palm sugar iced milk coffee at Rp45k & Rp85k (2 liters). Sold on Shopee, TikTok Shop and 2 takeaway outlets in Bekasi. Revenue ~Rp70M/month, ~1,500 orders, 35% repeat buyers. Gross margin ~55%.",
      },
      goal: {
        label: "Business target *",
        placeholder: "e.g. Revenue of Rp150M/month by the end of the period, resellers in 3 cities, repeat orders up to 45%",
      },
      budget: { label: "Monthly marketing budget", placeholder: "e.g. Rp15M/month (excluding team salaries)" },
      team: { label: "Marketing team", placeholder: "e.g. 1 social media admin, 1 freelance designer, owner runs the ads" },
      channels: {
        label: "Channels already in use",
        hint: "Leave empty if none yet — channels will be recommended.",
        options: CHANNELS_EN,
      },
      challenges: {
        label: "Challenges / obstacles (optional)",
        placeholder: "e.g. Ad ROAS has dropped for 3 months, competitors are slashing prices on Shopee, content is made last-minute",
      },
    },
  },

  // ------------------------------------------------ Brand guideline
  brand: {
    steps: [
      "Reading your business, audience & competitors…",
      "Defining brand essence & positioning…",
      "Shaping values, personality & tone of voice…",
      "Writing the messaging house & tagline…",
      "Building visual direction & word bank…",
      "Creating the brand book PPT & Excel…",
    ],
    fields: {
      brand: { label: "Brand name *", placeholder: "e.g. Rumah Rempah" },
      aspiration: { label: "What you want to be known for", placeholder: "e.g. the go-to modern spice kitchen for young families" },
      business: {
        label: "What you sell & to whom *",
        placeholder:
          "e.g. Premium instant cooking spice pastes made from real spices (rendang, opor, soto) at Rp28–45k, sold on Shopee, TikTok Shop & supermarkets across Java.",
      },
      audience: {
        label: "Target audience *",
        placeholder:
          "e.g. Working mothers & young couples aged 25–38 in big cities who want tasty home cooking but don't have time to grind spices.",
      },
      personality: { label: "Desired personality (3–5 adjectives)", placeholder: "e.g. warm, authentic, efficient, a bit playful" },
      competitors: { label: "Competitors (optional)", placeholder: "e.g. Bamboe, Sasa bumbu, Indofood Racik" },
      visual_now: {
        label: "Existing logo / colors (optional)",
        hint: "Describe your colors (hex if you know it) and current logo so the visual direction builds on them instead of replacing everything.",
        placeholder:
          "e.g. Serif wordmark logo in brick red #B5462B, cream packaging. Want it more modern while still feeling traditional.",
      },
    },
  },

  // ------------------------------------------------ Campaign brief
  campaign: {
    steps: [
      "Reading the brand, product & business problem…",
      "Uncovering the consumer insight…",
      "Shaping the proposition & big idea…",
      "Building the channel plan & deliverables…",
      "Working out the timeline & budget…",
      "Creating the brief PPT & Excel…",
    ],
    fields: {
      brand: { label: "Brand name *", placeholder: "e.g. Glowlab Skincare" },
      objective: {
        label: "Campaign objective",
        options: {
          awareness: "Awareness — reach more people",
          consideration: "Consideration — get considered & tried",
          sales: "Sales",
          launch: "New product/variant launch",
          retention: "Retention — repeat purchases & loyalty",
        },
      },
      product: {
        label: "Product / service being promoted *",
        placeholder:
          "e.g. Niacinamide 10% Serum 20ml Rp89k — a new variant for oily skin & acne marks, lightweight texture, BPOM-registered.",
      },
      audience: {
        label: "Target audience",
        placeholder: "e.g. Women aged 18–27, students & first jobbers, oily skin, buy skincare on TikTok Shop & Shopee",
      },
      period: { label: "Campaign period", placeholder: "e.g. 1–30 November 2026 (6 weeks including teaser)" },
      budget: { label: "Campaign budget (total)", placeholder: "e.g. Rp60M total (media + KOL + production)" },
      channels: { label: "Channels you want to use", hint: "Leave empty to get recommendations.", options: CHANNELS_EN },
      context: {
        label: "Situation / problem to solve",
        placeholder:
          "e.g. Sales of our old serum are flat at Rp40M/month; buyers don't see how it differs from cheaper competitors. We want to be known as the oily-skin experts.",
      },
      mandatory: {
        label: "Must-haves / don'ts (optional)",
        placeholder: "e.g. Must show the BPOM logo & notification number; no claims of 'removing acne' or comparing other brands",
      },
    },
  },

  // ------------------------------------------------ Go-to-market
  gtm: {
    steps: [
      "Reading the product & target buyers…",
      "Building the value proposition & priority segments…",
      "Setting positioning & pricing strategy…",
      "Planning pre-launch → launch → post-launch phases…",
      "Building the timeline, team checklist & launch-day runbook…",
      "Creating the GTM PPT & Excel…",
    ],
    fields: {
      brand: { label: "Brand name", placeholder: "e.g. Glowlab Skincare" },
      launch_date: { label: "Planned launch date", placeholder: "e.g. 1 December 2026" },
      product: {
        label: "New product & its advantages *",
        placeholder:
          "e.g. SPF50 PA++++ sunscreen stick 15g, non-sticky & no white cast, easy to reapply over makeup. BPOM-registered.",
      },
      market: {
        label: "Target buyers *",
        placeholder:
          "e.g. Women aged 20–30, office workers & students in big cities, active outdoors, already use sunscreen but rarely reapply",
      },
      price: { label: "Planned price", placeholder: "e.g. Rp79k (COGS Rp24k)" },
      budget: { label: "Launch budget (total)", placeholder: "e.g. Rp50M for 3 months" },
      channels: { label: "Available sales & promo channels", hint: "Leave empty to get recommendations.", options: CHANNELS_EN },
      competitors: {
        label: "Competitors / alternatives (optional)",
        placeholder: "e.g. Azarine sunstick Rp55k, Skin Aqua Rp65k, Somethinc Rp99k",
      },
    },
  },

  // ------------------------------------------------ Short video scripts
  script: {
    steps: [
      "Reading the product & key message…",
      "Choosing an angle & style for each script…",
      "Writing 3 hook variations per script…",
      "Building second-by-second scenes & on-screen text…",
      "Writing captions, shooting directions & Excel…",
    ],
    fields: {
      brand: { label: "Brand name *", placeholder: "e.g. Glowin Skincare" },
      platform: { label: "Platform", options: { tiktok: "TikTok", reels: "Instagram Reels", shorts: "YouTube Shorts" } },
      topic: {
        label: "Product / topic & key message *",
        placeholder:
          "e.g. Niacinamide 5% serum Rp89k (30 ml) for acne marks. Message: acne marks fade within 4 weeks of regular use, safe for oily skin. Targeting girls aged 18–28 who often wear heavy concealer.",
      },
      duration: {
        label: "Video length",
        options: { "15": "15 seconds", "30": "30 seconds", "45": "45 seconds", "60": "60 seconds" },
      },
      objective: {
        label: "Video goal",
        options: {
          awareness: "Get known (awareness)",
          engagement: "Engagement (comments, shares, saves)",
          jualan: "Sales (cart / link clicks)",
          edukasi: "Education",
        },
      },
      styles: {
        label: "Video styles *",
        options: {
          talking_head: "Talking head",
          pov: "POV",
          tutorial: "Tutorial / how-to",
          before_after: "Before–after",
          storytelling: "Storytelling",
          review_ugc: "Review / UGC",
          trend: "Ride a trend",
          skit: "Skit / short drama",
        },
      },
      count: { label: "Number of scripts", suffix: "scripts" },
      talent: { label: "Who's on camera & gear (optional)", placeholder: "e.g. female owner, 25, phone + ring light, no mic" },
      tone: { label: "Tone of voice (optional)", placeholder: "e.g. casual, like venting to a bestie, a bit playful" },
    },
  },

  // ------------------------------------------------ Social account audit
  audit: {
    steps: [
      "Reading the profile, bio & content data…",
      "Scoring 7 account aspects…",
      "Finding evidence in performance data…",
      "Writing a new bio & highlight structure…",
      "Building the 30-day plan, PPT & Excel…",
    ],
    fields: {
      platform: { label: "Platform", options: { instagram: "Instagram", tiktok: "TikTok" } },
      handle: { label: "Account username *", placeholder: "e.g. @kopisenja.id" },
      niche: {
        label: "Brand & what you sell *",
        placeholder:
          "e.g. Kopi Senja — liter-size palm sugar iced milk coffee at Rp45k, sold on Shopee & TikTok Shop, targeting office workers aged 22–35 in Greater Jakarta.",
      },
      bio: { label: "Current bio (copy as is)", placeholder: "e.g. Liter-size iced coffee ☕ | Order via Shopee 👇 | linktr.ee/kopisenja" },
      followers: { label: "Follower count", placeholder: "e.g. 3,240" },
      frequency: { label: "Posts per week", placeholder: "e.g. 2–3x, irregular" },
      data: {
        label: "Data from your last / best 5–10 posts",
        hint: "One line per post: format, topic, views/reach, likes, comments, saves/shares. The more complete, the sharper the audit.",
        placeholder:
          "e.g.\nReels 12/9 — liter coffee brewing tutorial — 8,400 views, 210 likes, 14 comments, 96 saves\nCarousel 10/9 — 9.9 promo — 900 reach, 31 likes, 2 comments\nProduct photo 7/9 — 640 reach, 22 likes",
      },
      attachment_ids: {
        label: "Profile & insight screenshots (optional)",
        hint: "Screenshots of your profile page, grid, and 30-day insights/analytics. PNG/JPG/PDF — max 5 files.",
      },
      goal: {
        label: "Account goal",
        options: {
          sales: "Sales / orders",
          leads: "Chats & leads (DM/WhatsApp)",
          awareness: "Reach more people",
          community: "Community & loyalty",
          authority: "Build trust/expertise",
        },
      },
    },
  },

  // ------------------------------------------------ Ad variations
  adcopy: {
    steps: [
      "Reading the product, offer & proof…",
      "Mapping angles & audiences…",
      "Writing hooks, primary text & headlines…",
      "Checking character limits & ad policies…",
      "Building the A/B test plan & Excel…",
    ],
    fields: {
      brand: { label: "Brand name *", placeholder: "e.g. Kopi Senja" },
      platform: {
        label: "Ad platform",
        options: {
          meta: "Meta (Facebook & Instagram)",
          tiktok: "TikTok Ads",
          google: "Google Search Ads",
          shopee: "Shopee Ads",
        },
      },
      product: {
        label: "Product & price *",
        placeholder:
          "e.g. 1-liter palm sugar iced milk coffee Rp45k (6 glasses), keeps 5 days in the fridge, instant delivery across Greater Jakarta.",
      },
      offer: { label: "Promo / offer (optional)", placeholder: "e.g. Buy 2 get free shipping + a 250 ml bonus, until 31 Oct" },
      landing: { label: "Ads send people to", placeholder: "e.g. Shopee store / WhatsApp / kopisenja.id" },
      objective: {
        label: "Ad objective",
        options: {
          penjualan: "Sales",
          leads: "Leads / WhatsApp chats",
          traffic: "Traffic to website/store",
          awareness: "Awareness",
          install: "App installs",
        },
      },
      count: { label: "Number of variations", suffix: "variations" },
      audience: {
        label: "Target audience (optional)",
        placeholder: "e.g. Office workers aged 22–35 in Greater Jakarta, drink coffee daily, often buy Rp25k coffees",
      },
      usp: {
        label: "Advantages & proof (optional)",
        hint: "Only list proof that actually exists: ratings, units sold, testimonials, certifications. The AI won't make up claims.",
        placeholder:
          "e.g. 4.9 rating from 2,100 Shopee reviews, real palm sugar with no artificial sweeteners, brewed in the morning and shipped the same day",
      },
      budget: { label: "Daily ad budget (optional)", placeholder: "e.g. Rp300k/day" },
    },
  },

  // ------------------------------------------------ Marketplace promo calendar
  promo: {
    steps: [
      "Reading products, prices & COGS…",
      "Mapping double dates, paydays & shopping seasons…",
      "Designing mechanics & vouchers for each event…",
      "Calculating margins after promos…",
      "Planning stock, checklist & Excel file…",
    ],
    fields: {
      store: { label: "Store name *", placeholder: "e.g. Glowria Official Shop" },
      start_month: { label: "Start month" },
      platforms: {
        label: "Marketplaces / channels *",
        options: {
          shopee: "Shopee",
          tiktok_shop: "TikTok Shop",
          tokopedia: "Tokopedia",
          lazada: "Lazada",
          website: "Website / own store",
        },
      },
      months: { label: "Plan length", options: { "1": "1 month", "2": "2 months", "3": "3 months" } },
      goal: {
        label: "Main goal",
        options: {
          omzet: "Maximize revenue",
          peringkat: "Boost store & product ranking",
          cuci_stok: "Clear old stock",
          pembeli_baru: "Acquire new buyers",
        },
      },
      products: {
        label: "Main products, selling price & COGS/margin *",
        hint: "One product per line. The more complete the COGS, the more accurate the promo margin math.",
        placeholder:
          "e.g.\nNiacinamide Serum 30ml — sells at Rp149,000, COGS Rp38,000 (~60 sold/day)\nMoisturizer Gel 50g — sells at Rp119,000, COGS Rp31,000\nSunscreen SPF50 — sells at Rp89,000, COGS Rp27,000",
      },
      budget: {
        label: "Discount subsidy capacity & ad budget (optional)",
        placeholder: "e.g. max 30% discount, voucher subsidy ~Rp20M/month, Shopee ads + GMV Max Rp60M/month",
      },
      notes: {
        label: "Other notes (optional)",
        placeholder:
          "e.g. current revenue ~Rp1.8B/month, warehouse stock in Jakarta, new variant launching early December, 2 regular live hosts",
      },
    },
  },

  // ------------------------------------------------ Follow-up flow
  flow: {
    steps: [
      "Reading the product & customer journey…",
      "Setting triggers & exit conditions per stage…",
      "Writing messages for each time gap…",
      "Setting targets & safe-sending rules…",
      "Building the flow map & Excel file…",
    ],
    fields: {
      business: {
        label: "Business, products, prices & how to order *",
        placeholder:
          "e.g. Dimsum Laras — frozen dimsum, 20 pcs Rp65,000, value pack of 3 Rp180,000. Orders via WhatsApp admin & website, instant delivery in Greater Jakarta, frozen courier across Java. Buyers are mostly housewives aged 28–40.",
      },
      channel: { label: "Follow-up channel", options: { whatsapp: "WhatsApp", email: "Email", both: "WhatsApp + email" } },
      cycle: { label: "Repurchase cycle", hint: "Average time before a customer buys again.", suffix: "days" },
      stages: {
        label: "Stages to build *",
        options: {
          lead: "New lead",
          no_order: "Chatted but didn't order",
          cart: "Abandoned cart / checkout",
          post_purchase: "After purchase",
          review: "Ask for a review",
          repeat: "Repeat order",
          winback: "Win back inactive customers",
        },
      },
      tool: { label: "Tools you use (optional)", placeholder: "e.g. WhatsApp Business (manual), Qontak, Wati, Mekari, Klaviyo" },
      tone: { label: "Tone of voice (optional)", placeholder: "e.g. warm like a friend, address customers as 'Kak'" },
    },
  },

  // ------------------------------------------------ Loyalty program
  loyalty: {
    steps: [
      "Reading your business model & customer numbers…",
      "Choosing the most profitable program model…",
      "Setting points, tier & reward rules…",
      "Calculating program cost vs profit…",
      "Writing launch materials & Excel file…",
    ],
    fields: {
      business: {
        label: "Business & customers *",
        placeholder:
          "e.g. Kopi Tepi Kota — 3 iced milk coffee outlets in Bandung + GrabFood/GoFood. Best seller: iced milk coffee Rp28k. Customers are students & workers aged 20–30; the cashier uses Moka POS.",
      },
      aov: { label: "Average spend per transaction (Rp)" },
      margin: { label: "Gross margin", suffix: "%" },
      frequency: { label: "Average purchases per customer per year", suffix: "times" },
      customers: { label: "Number of active customers", suffix: "people" },
      model: {
        label: "Program model",
        options: {
          recommend: "Just recommend one",
          points: "Points",
          tier: "Tiers / member levels",
          stamp: "Stamp card",
          referral: "Referral",
          paid: "Paid membership",
        },
      },
      budget: { label: "Program budget (optional)", placeholder: "e.g. max Rp3M/month including the member app" },
    },
  },

  // ------------------------------------------------ KOL performance report
  kolreport: {
    steps: [
      "Reading creator data & insight screenshots…",
      "Tidying up numbers per creator…",
      "Calculating CPM, ER, cost per order & ROAS…",
      "Scoring & ranking creators…",
      "Drafting insights & the next wave plan…",
      "Building the PPT & Excel…",
    ],
    fields: {
      campaign: { label: "Campaign name *", placeholder: "e.g. Glow Up 10.10 — Niacinamide Serum" },
      brand: { label: "Brand / client", placeholder: "e.g. Skinfaa" },
      objective: {
        label: "Campaign objective",
        options: {
          awareness: "Awareness (reach & views)",
          engagement: "Engagement (interactions)",
          penjualan: "Sales (orders & revenue)",
          install: "Installs / sign-ups",
        },
      },
      period: { label: "Posting period", placeholder: "e.g. 1–15 October 2026" },
      attachment_ids: {
        label: "Creator results data",
        hint: "Upload your team's recap, TikTok Shop Affiliate / Shopee Affiliate exports, or insight screenshots for each post. CSV, Excel, PDF, PNG/JPG — max 5 files.",
      },
      data: {
        label: "Or type the data per creator",
        hint: "One line per creator: name, platform, followers, fee, views, likes, comments, shares, saves, clicks, orders, revenue. Fill in whatever you have.",
        placeholder:
          "@rarasoraya, TikTok, 85k, fee Rp2.5M, views 142k, likes 9,800, comments 410, shares 260, saves 1,150, clicks 2,300, orders 186, revenue Rp22.3M\n@dindaskincarediary, IG Reels, 420k, fee Rp9M, views 98k, likes 3,100, comments 95, saves 240, orders 41, revenue Rp4.9M",
      },
      notes: {
        label: "Campaign notes (optional)",
        hint: "KPI targets, product price/AOV, margin, attribution method (voucher codes/affiliate links), content brief, special events.",
        placeholder:
          "e.g. ROAS target 3x, serum price Rp119k, 55% gross margin, attribution via per-creator voucher codes. Brief: honest review after 7 days of use.",
      },
    },
  },

  // ------------------------------------------------ Press release
  press: {
    steps: [
      "Finding a newsworthy angle…",
      "Writing the headline & 5W1H lead…",
      "Writing the body & spokesperson quotes…",
      "Preparing the pitch email & media list…",
      "Building journalist Q&A & distribution checklist…",
    ],
    fields: {
      organization: { label: "Company / organization name *", placeholder: "e.g. PT Kopi Senja Nusantara" },
      type: {
        label: "News type",
        options: {
          launch: "Product / service launch",
          partnership: "Partnership / collaboration",
          milestone: "Achievement / milestone",
          event: "Event",
          csr: "CSR / social activity",
          funding: "Funding / investment",
          statement: "Official statement",
        },
      },
      details: {
        label: "News details *",
        hint: "What happened, when, where, key numbers, who's involved, and the benefit to the public. The more facts, the stronger the story.",
        placeholder:
          "e.g. Kopi Senja opens its 50th outlet in Bandung (Jl. Braga 12) on 3 November 2026. Since starting in Yogyakarta in 2019, it has served 2.1 million transactions. The outlet employs 18 local residents and uses 100% coffee beans from Pangalengan farmers (a partnership with 40 farmers). Opening promo: buy 1 get 1 free for 3 days.",
      },
      spokesperson: {
        label: "Spokesperson (name & title)",
        placeholder: "e.g. Rina Hartono, CEO of Kopi Senja; Asep Sutisna, Head of the Farmers' Group",
      },
      dateline: { label: "Release city & date", placeholder: "e.g. Bandung, 3 November 2026" },
      contact: { label: "Media contact", placeholder: "e.g. Dewi (PR) · 0812-xxxx-xxxx · pr@kopisenja.id" },
      boilerplate: {
        label: "About the company (optional)",
        placeholder: "e.g. Kopi Senja is a Yogyakarta-born chain of milk coffee shops founded in 2019…",
      },
      target_media: {
        label: "Target media *",
        options: {
          nasional: "National / general",
          bisnis: "Business & economy",
          teknologi: "Technology",
          lifestyle: "Lifestyle",
          lokal: "Local / regional",
          trade: "Trade / industry",
        },
      },
    },
  },
};
