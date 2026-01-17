type Classified = { category: string; tags: string[] };

function classifyVariation(variation: any): Classified {
  const name = (variation?.name || '').toLowerCase();
  const code = (variation?.variation_code || '').toLowerCase();

  // Keyword sets
  const isMonthly = (
    name.includes('monthly') || name.includes('month plan') || name.includes('months plan') ||
    code.includes('monthly') || /\b30\s*days?\b/.test(name) || /\b\d+\s*months?\b/.test(name)
  );
  const isWeekly = (
    name.includes('weekly') || name.includes('week') || code.includes('week') || /\b7\s*days?\b/.test(name)
  );
  const isDaily = (
    /\b(\d+)\s*(day|days)\b/.test(name) || name.includes('hr') || name.includes('hour') || code.includes('daily')
  );
  const isNight = (name.includes('night') || code.includes('night') || name.includes('nite'));
  const isWeekend = (name.includes('weekend') || code.includes('weekend') || name.includes('wknd'));
  const isHynetflex = name.includes('hynetflex');
  const isBroadbandRouter = (name.includes('broadband') || name.includes('router'));
  const isSME = (name.includes('sme') || code.includes('sme'));
  const isSocial = (
    name.includes('social') || code.includes('social') ||
    name.includes('youtube') || name.includes('instagram') || name.includes('facebook') ||
    name.includes('tiktok') || name.includes('whatsapp') || name.includes('opera') ||
    name.includes('twitter') || name.includes('x ') || name.endsWith(' x') || name.includes('binge') ||
    name.includes('chat pack')
  );

  // Build tags
  const tags: string[] = [];
  if (isNight) tags.push('Night');
  if (isWeekend) tags.push('Weekend');
  if (isSME) tags.push('SME');
  if (isSocial) tags.push('Social');
  if (isHynetflex) tags.push('Hynetflex');
  if (isBroadbandRouter) tags.push('Broadband router');

  // Precedence: SME > Social > Monthly > Weekly > Daily > Night > Weekend > Hynetflex > Broadband router > Others
  let category = 'Others';
  if (isSME) category = 'SME';
  else if (isSocial) category = 'Social';
  else if (isMonthly) category = 'Monthly';
  else if (isWeekly) category = 'Weekly';
  else if (isDaily) category = 'Daily';
  else if (isNight) category = 'Night';
  else if (isWeekend) category = 'Weekend';
  else if (isHynetflex) category = 'Hynetflex';
  else if (isBroadbandRouter) category = 'Broadband router';

  return { category, tags };
}

export function categorizeVariations(variations: any[]): any {
  // Attach stable auto-incrementing ids to each variation
  const withId = (variations || []).map((v: any, idx: number) => ({ ...v, id: idx + 1 }));

  const categorized: Record<string, any[]> = {
    All: [],
    Daily: [],
    Weekly: [],
    Monthly: [],
    Night: [],
    Weekend: [],
    Social: [],
    SME: [],
    Hynetflex: [],
    'Broadband router': [],
    Others: [],
  };

  withId.forEach((variation) => {
    const { category, tags } = classifyVariation(variation);
    categorized.All.push({ ...variation, tags });
    if (!categorized[category]) categorized[category] = [];
    categorized[category].push({ ...variation, tags });
    // Add direct buckets for some tags for easier consumption
    if (tags.includes('Weekend')) categorized.Weekend.push({ ...variation, tags });
    if (tags.includes('Social')) categorized.Social.push({ ...variation, tags });
    if (tags.includes('SME')) categorized.SME.push({ ...variation, tags });
    if (tags.includes('Hynetflex')) categorized.Hynetflex.push({ ...variation, tags });
    if (tags.includes('Broadband router')) categorized['Broadband router'].push({ ...variation, tags });
  });

  // Add count to each category
  const result: any = {};
  Object.keys(categorized).forEach((key) => {
    result[key] = {
      count: categorized[key].length,
      variations: categorized[key],
    };
  });

  // Include the id-enriched flat list for callers that want linear access
  (result as any)._all_with_id = withId;

  // Add total count
  result.total = variations.length;

  return result;
}

