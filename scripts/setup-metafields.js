import 'dotenv/config';
import { getAccessToken } from './auth.js';
import { basename } from 'node:path';

const STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const PRODUCT_ID_1 = process.env.PRODUCT_ID_1;
const PRODUCT_ID_2 = process.env.PRODUCT_ID_2;

if (!STORE_URL || !API_KEY || !API_SECRET) {
  console.error('Missing SHOPIFY_STORE_URL, SHOPIFY_API_KEY, or SHOPIFY_API_SECRET in .env');
  process.exit(1);
}

let ACCESS_TOKEN;
const GRAPHQL_URL = `https://${STORE_URL}/admin/api/2025-04/graphql.json`;

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL request failed');
  }
  return json.data;
}

// ─── File Upload Helpers ─────────────────────────────────────────────────────

async function uploadImageFromUrl(sourceUrl, filename) {
  console.log(`  Uploading ${filename}...`);

  // Step 1: Download from source
  const imageRes = await fetch(sourceUrl);
  if (!imageRes.ok) throw new Error(`Failed to download: ${sourceUrl}`);
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg';

  // Step 2: Create staged upload
  const staged = await shopifyGraphQL(`
    mutation StagedUpload($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `, {
    input: [{
      filename,
      mimeType: contentType,
      httpMethod: 'POST',
      resource: 'FILE',
    }],
  });

  const target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('No staged upload target returned');

  // Step 3: Upload to staged URL
  const formData = new FormData();
  for (const param of target.parameters) {
    formData.append(param.name, param.value);
  }
  formData.append('file', new Blob([imageBuffer], { type: contentType }), filename);

  const uploadRes = await fetch(target.url, { method: 'POST', body: formData });
  if (!uploadRes.ok && uploadRes.status !== 201) {
    throw new Error(`Staged upload failed: ${uploadRes.status}`);
  }

  // Step 4: Create file in Shopify
  const fileCreate = await shopifyGraphQL(`
    mutation FileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id alt }
        userErrors { field message }
      }
    }
  `, {
    files: [{
      originalSource: target.resourceUrl,
      filename,
      alt: filename.replace(/\.[^.]+$/, '').replace(/-/g, ' '),
    }],
  });

  const file = fileCreate.fileCreate.files?.[0];
  if (!file) {
    console.error('  -> File create errors:', fileCreate.fileCreate.userErrors);
    return null;
  }

  // Step 5: Poll until READY
  let fileGid = file.id;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const check = await shopifyGraphQL(`
      query CheckFile($id: ID!) {
        node(id: $id) {
          ... on MediaImage { fileStatus image { url } }
          ... on GenericFile { fileStatus url }
        }
      }
    `, { id: fileGid });

    const node = check.node;
    if (node?.fileStatus === 'READY') {
      console.log(`  -> Uploaded: ${fileGid}`);
      return fileGid;
    }
    if (node?.fileStatus === 'FAILED') {
      console.error('  -> Upload failed');
      return null;
    }
  }
  // Return even if not confirmed READY yet — Shopify may still be processing
  console.log(`  -> Created (processing): ${fileGid}`);
  return fileGid;
}

// ─── Metaobject Definition Helpers ───────────────────────────────────────────

const metaobjectDefinitionIds = {};

async function createMetaobjectDefinition(type, name, fieldDefinitions) {
  console.log(`Creating metaobject definition: ${type}...`);
  const data = await shopifyGraphQL(`
    mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id type }
        userErrors { field message }
      }
    }
  `, {
    definition: { type, name, access: { storefront: 'PUBLIC_READ' }, fieldDefinitions },
  });

  const result = data.metaobjectDefinitionCreate;
  if (result.userErrors.length > 0) {
    if (result.userErrors.some(e => e.message.includes('already'))) {
      console.log(`  -> Already exists, skipping.`);
      return null;
    }
    console.error('  -> Errors:', result.userErrors);
    return null;
  }
  console.log(`  -> Created: ${result.metaobjectDefinition.id}`);
  return result.metaobjectDefinition.id;
}

async function getMetaobjectDefinitionId(type) {
  const data = await shopifyGraphQL(`
    query GetDef($type: String!) {
      metaobjectDefinitionByType(type: $type) { id }
    }
  `, { type });
  return data.metaobjectDefinitionByType?.id || null;
}

async function createAllMetaobjectDefinitions() {
  metaobjectDefinitionIds.product_ingredient = await createMetaobjectDefinition('product_ingredient', 'Product Ingredient', [
    { key: 'name', name: 'Name', type: 'single_line_text_field', required: true },
    { key: 'dosage', name: 'Dosage', type: 'single_line_text_field' },
    { key: 'image', name: 'Image', type: 'file_reference' },
    { key: 'detail_items', name: 'Detail Items', type: 'list.single_line_text_field' },
  ]);

  metaobjectDefinitionIds.product_timeline_phase = await createMetaobjectDefinition('product_timeline_phase', 'Product Timeline Phase', [
    { key: 'period', name: 'Period', type: 'single_line_text_field', required: true },
    { key: 'title', name: 'Title', type: 'single_line_text_field', required: true },
    { key: 'pill_color', name: 'Pill Color', type: 'color' },
    { key: 'details', name: 'Details', type: 'list.single_line_text_field' },
  ]);

  metaobjectDefinitionIds.faq = await createMetaobjectDefinition('faq', 'FAQ', [
    { key: 'question', name: 'Question', type: 'single_line_text_field', required: true },
    { key: 'answer', name: 'Answer', type: 'multi_line_text_field', required: true },
  ]);

  // Fetch GIDs for definitions that already existed
  for (const type of ['product_ingredient', 'product_timeline_phase', 'faq']) {
    if (!metaobjectDefinitionIds[type]) {
      metaobjectDefinitionIds[type] = await getMetaobjectDefinitionId(type);
    }
  }

  // Group definitions (need child definition GIDs)
  metaobjectDefinitionIds.timeline_group = await createMetaobjectDefinition('timeline_group', 'Timeline Group', [
    { key: 'title', name: 'Title', type: 'single_line_text_field', required: true },
    {
      key: 'phases', name: 'Phases', type: 'list.metaobject_reference',
      validations: [{ name: 'metaobject_definition_id', value: metaobjectDefinitionIds.product_timeline_phase }],
    },
  ]);

  metaobjectDefinitionIds.faq_group = await createMetaobjectDefinition('faq_group', 'FAQ Group', [
    { key: 'title', name: 'Title', type: 'single_line_text_field', required: true },
    {
      key: 'faqs', name: 'FAQs', type: 'list.metaobject_reference',
      validations: [{ name: 'metaobject_definition_id', value: metaobjectDefinitionIds.faq }],
    },
  ]);

  for (const type of ['timeline_group', 'faq_group']) {
    if (!metaobjectDefinitionIds[type]) {
      metaobjectDefinitionIds[type] = await getMetaobjectDefinitionId(type);
    }
  }
}

// ─── Metafield Definition Helpers ────────────────────────────────────────────

async function createMetafieldDefinition(namespace, key, name, type) {
  console.log(`Creating metafield definition: ${namespace}.${key}...`);
  const input = { namespace, key, name, type, ownerType: 'PRODUCT', pin: true };

  if (type === 'list.metaobject_reference' || type === 'metaobject_reference') {
    const metaobjectType = {
      ingredients: 'product_ingredient',
      timeline_phases: 'timeline_group',
      faqs: 'faq_group',
    }[key];
    if (metaobjectType && metaobjectDefinitionIds[metaobjectType]) {
      input.validations = [{ name: 'metaobject_definition_id', value: metaobjectDefinitionIds[metaobjectType] }];
    }
  }

  const data = await shopifyGraphQL(`
    mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id namespace key }
        userErrors { field message }
      }
    }
  `, { definition: input });

  const result = data.metafieldDefinitionCreate;
  if (result.userErrors.length > 0) {
    if (result.userErrors.some(e => e.message.includes('already'))) {
      console.log(`  -> Already exists, skipping.`);
      return;
    }
    console.error('  -> Errors:', result.userErrors);
    return;
  }
  console.log(`  -> Created: ${result.createdDefinition.id}`);
}

async function createAllMetafieldDefinitions() {
  await createMetafieldDefinition('product_details', 'problem_heading', 'Problem Heading', 'single_line_text_field');
  await createMetafieldDefinition('product_details', 'problem_body', 'Problem Body', 'multi_line_text_field');
  await createMetafieldDefinition('product_details', 'problem_image', 'Problem Image', 'file_reference');
  await createMetafieldDefinition('product_details', 'ingredients', 'Ingredients', 'list.metaobject_reference');
  await createMetafieldDefinition('product_details', 'timeline_phases', 'Timeline Phases', 'metaobject_reference');
  await createMetafieldDefinition('product_details', 'faqs', 'FAQs', 'metaobject_reference');
}

// ─── Metaobject Entry Helpers ────────────────────────────────────────────────

async function createMetaobject(type, handle, fields) {
  console.log(`Creating metaobject: ${type}/${handle}...`);
  const data = await shopifyGraphQL(`
    mutation Create($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }
  `, { metaobject: { type, handle, fields } });

  const result = data.metaobjectCreate;
  if (result.userErrors.length > 0) {
    if (result.userErrors.some(e => e.message.includes('already'))) {
      console.log(`  -> Already exists, fetching...`);
      return await getMetaobjectByHandle(type, handle);
    }
    console.error('  -> Errors:', result.userErrors);
    return null;
  }
  console.log(`  -> Created: ${result.metaobject.id}`);
  return result.metaobject.id;
}

async function getMetaobjectByHandle(type, handle) {
  const data = await shopifyGraphQL(`
    query Get($handle: MetaobjectHandleInput!) {
      metaobjectByHandle(handle: $handle) { id }
    }
  `, { handle: { type, handle } });
  return data.metaobjectByHandle?.id || null;
}

async function setProductMetafields(productId, metafields) {
  if (!productId) return;
  console.log(`Setting metafields on product: ${productId}...`);
  const data = await shopifyGraphQL(`
    mutation Update($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `, { input: { id: productId, metafields } });

  const result = data.productUpdate;
  if (result.userErrors.length > 0) {
    console.error('  -> Errors:', result.userErrors);
    return;
  }
  console.log(`  -> Metafields set successfully.`);
}

// ─── Figma Asset URLs (ingredient card images) ──────────────────────────────

const FIGMA_IMAGES = {
  // Product 1 (Colostrum) — from Figma 589:424
  colostrum: 'https://www.figma.com/api/mcp/asset/4443d89f-38b5-4889-ab90-dc2284046650',
  betaGlucan: 'https://www.figma.com/api/mcp/asset/ae1a2f78-a4a5-4828-b778-01ecc673dbcb',
  digestive: 'https://www.figma.com/api/mcp/asset/d84cc70b-6d35-4cf4-8bd1-c7b9cd6e4df6',
  immune: 'https://www.figma.com/api/mcp/asset/993b161d-9087-4501-94d2-dcc18d70a8e2',
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Knowbody PDP Metafield Setup ===\n');
  ACCESS_TOKEN = await getAccessToken(STORE_URL, API_KEY, API_SECRET);
  console.log('');

  // Step 1: Definitions
  console.log('--- Step 1: Creating Metaobject Definitions ---');
  await createAllMetaobjectDefinitions();
  console.log('');

  console.log('--- Step 2: Creating Metafield Definitions ---');
  await createAllMetafieldDefinitions();
  console.log('');

  // Step 3: Upload images from Figma
  console.log('--- Step 3: Uploading Images ---');
  const imgIds = {};
  imgIds.colostrum = await uploadImageFromUrl(FIGMA_IMAGES.colostrum, 'ingredient-colostrum.jpg');
  imgIds.betaGlucan = await uploadImageFromUrl(FIGMA_IMAGES.betaGlucan, 'ingredient-beta-glucan.jpg');
  imgIds.digestive = await uploadImageFromUrl(FIGMA_IMAGES.digestive, 'ingredient-digestive-support.jpg');
  imgIds.immune = await uploadImageFromUrl(FIGMA_IMAGES.immune, 'ingredient-immune-nutrients.jpg');
  console.log('');

  // Step 4a: Product 1 seed data (Colostrum — from Figma)
  console.log('--- Step 4a: Seed Data (Product 1 — Colostrum) ---');

  const p1Ingredients = [
    { handle: 'pure-bovine-colostrum', fields: [
      { key: 'name', value: 'Pure Bovine Colostrum' },
      { key: 'dosage', value: '3g' },
      { key: 'image', value: imgIds.colostrum },
      { key: 'detail_items', value: JSON.stringify([]) },
    ]},
    { handle: 'beta-glucan', fields: [
      { key: 'name', value: 'Beta Glucan' },
      { key: 'dosage', value: '250mg' },
      { key: 'image', value: imgIds.betaGlucan },
      { key: 'detail_items', value: JSON.stringify([]) },
    ]},
    { handle: 'digestive-support-complex', fields: [
      { key: 'name', value: 'Digestive Support Complex' },
      { key: 'dosage', value: '' },
      { key: 'image', value: imgIds.digestive },
      { key: 'detail_items', value: JSON.stringify([
        '3g prebiotic fiber (PHGG) for microbiome balance',
        'L-Glutamine to fuel intestinal cells and support gut barrier',
        'Digestive enzymes for comfort and nutrient absorption',
      ]) },
    ]},
    { handle: 'immune-supporting-nutrients', fields: [
      { key: 'name', value: 'Immune-Supporting Nutrients' },
      { key: 'dosage', value: '' },
      { key: 'image', value: imgIds.immune },
      { key: 'detail_items', value: JSON.stringify([]) },
    ]},
  ];

  const p1IngIds = [];
  for (const ing of p1Ingredients) {
    const id = await createMetaobject('product_ingredient', ing.handle, ing.fields);
    if (id) p1IngIds.push(id);
  }

  const PURPLE = '#DBBDFF';
  const YELLOW = '#FFFB56';

  const p1Phases = [
    { handle: 'weeks-1-2', fields: [
      { key: 'period', value: 'Weeks 1-2' }, { key: 'title', value: 'Initial Adaptation' },
      { key: 'pill_color', value: PURPLE },
      { key: 'details', value: JSON.stringify(['Initial digestive adaptation and energy changes', 'When gut comfort improvements typically begin']) },
    ]},
    { handle: 'weeks-3-4', fields: [
      { key: 'period', value: 'Weeks 3-4' }, { key: 'title', value: 'Building Foundation' },
      { key: 'pill_color', value: YELLOW },
      { key: 'details', value: JSON.stringify(['Initial digestive adaptation and energy changes', 'When gut comfort improvements typically begin']) },
    ]},
    { handle: 'weeks-5-8', fields: [
      { key: 'period', value: 'Weeks 5-8' }, { key: 'title', value: 'Strengthening Support' },
      { key: 'pill_color', value: PURPLE },
      { key: 'details', value: JSON.stringify(['Initial digestive adaptation and energy changes', 'When gut comfort improvements typically begin']) },
    ]},
    { handle: 'weeks-8-plus', fields: [
      { key: 'period', value: 'Weeks 8+' }, { key: 'title', value: 'Sustained Wellness' },
      { key: 'pill_color', value: YELLOW },
      { key: 'details', value: JSON.stringify(['Initial digestive adaptation and energy changes', 'When gut comfort improvements typically begin']) },
    ]},
  ];

  const p1PhaseIds = [];
  for (const p of p1Phases) { const id = await createMetaobject('product_timeline_phase', p.handle, p.fields); if (id) p1PhaseIds.push(id); }

  const p1Faqs = [
    { handle: 'how-long-results', fields: [{ key: 'question', value: 'How long does it take to see results?' }, { key: 'answer', value: 'Most customers notice digestive improvements within 1-2 weeks, with immune benefits building over 4-8 weeks of consistent use.' }] },
    { handle: 'safe-daily', fields: [{ key: 'question', value: 'Is this safe to take daily?' }, { key: 'answer', value: 'Yes, our formula is designed for daily use. All ingredients are at clinically studied dosages and sourced from trusted suppliers.' }] },
    { handle: 'upset-stomach', fields: [{ key: 'question', value: 'Will this upset my stomach?' }, { key: 'answer', value: 'Our formula includes digestive enzymes and prebiotic fiber specifically to support comfortable digestion from day one.' }] },
    { handle: 'taste', fields: [{ key: 'question', value: 'How does this taste?' }, { key: 'answer', value: 'Our formula has a mild, neutral flavor that mixes easily into water, smoothies, coffee, or any beverage of your choice.' }] },
    { handle: 'other-supplements', fields: [{ key: 'question', value: 'Can I take this with other supplements?' }, { key: 'answer', value: 'Yes, our formula is designed to complement your existing supplement routine. As always, consult your healthcare provider if you have specific concerns.' }] },
    { handle: 'doesnt-work', fields: [{ key: 'question', value: "What if it doesn't work for me?" }, { key: 'answer', value: "We offer a 30-day money-back guarantee. If you're not satisfied with your results, contact us for a full refund." }] },
  ];

  const p1FaqIds = [];
  for (const f of p1Faqs) { const id = await createMetaobject('faq', f.handle, f.fields); if (id) p1FaqIds.push(id); }

  const p1TimelineGroupId = await createMetaobject('timeline_group', 'colostrum-timeline', [
    { key: 'title', value: 'Colostrum Product Timeline' },
    { key: 'phases', value: JSON.stringify(p1PhaseIds.filter(Boolean)) },
  ]);
  const p1FaqGroupId = await createMetaobject('faq_group', 'colostrum-faqs', [
    { key: 'title', value: 'Colostrum Product FAQs' },
    { key: 'faqs', value: JSON.stringify(p1FaqIds.filter(Boolean)) },
  ]);
  console.log('');

  // Step 4b: Product 2 seed data (Daily Greens — dummy)
  console.log('--- Step 4b: Seed Data (Product 2 — Daily Greens) ---');

  // Reuse same images for dummy product (no unique Figma assets for product 2)
  const p2Ingredients = [
    { handle: 'organic-spirulina', fields: [
      { key: 'name', value: 'Organic Spirulina' }, { key: 'dosage', value: '2g' },
      { key: 'image', value: imgIds.colostrum }, { key: 'detail_items', value: JSON.stringify([]) },
    ]},
    { handle: 'chlorella-extract', fields: [
      { key: 'name', value: 'Chlorella Extract' }, { key: 'dosage', value: '500mg' },
      { key: 'image', value: imgIds.betaGlucan }, { key: 'detail_items', value: JSON.stringify([]) },
    ]},
    { handle: 'prebiotic-fiber-blend', fields: [
      { key: 'name', value: 'Prebiotic Fiber Blend' }, { key: 'dosage', value: '' },
      { key: 'image', value: imgIds.digestive },
      { key: 'detail_items', value: JSON.stringify(['Inulin from chicory root for healthy gut flora', 'Acacia fiber for gentle digestive support', 'Green banana resistant starch for microbiome diversity']) },
    ]},
    { handle: 'adaptogen-complex', fields: [
      { key: 'name', value: 'Adaptogen Complex' }, { key: 'dosage', value: '' },
      { key: 'image', value: imgIds.immune }, { key: 'detail_items', value: JSON.stringify([]) },
    ]},
  ];

  const p2IngIds = [];
  for (const ing of p2Ingredients) { const id = await createMetaobject('product_ingredient', ing.handle, ing.fields); if (id) p2IngIds.push(id); }

  const p2Phases = [
    { handle: 'greens-weeks-1-2', fields: [{ key: 'period', value: 'Weeks 1-2' }, { key: 'title', value: 'Gentle Reset' }, { key: 'pill_color', value: YELLOW }, { key: 'details', value: JSON.stringify(['Body adjusts to daily greens intake', 'Early energy and digestion improvements']) }] },
    { handle: 'greens-weeks-3-4', fields: [{ key: 'period', value: 'Weeks 3-4' }, { key: 'title', value: 'Gut Rebalance' }, { key: 'pill_color', value: PURPLE }, { key: 'details', value: JSON.stringify(['Microbiome diversity begins increasing', 'Reduced bloating and improved regularity']) }] },
    { handle: 'greens-weeks-5-8', fields: [{ key: 'period', value: 'Weeks 5-8' }, { key: 'title', value: 'Full Vitality' }, { key: 'pill_color', value: YELLOW }, { key: 'details', value: JSON.stringify(['Sustained energy throughout the day', 'Noticeable skin and hair improvements']) }] },
    { handle: 'greens-weeks-8-plus', fields: [{ key: 'period', value: 'Weeks 8+' }, { key: 'title', value: 'Optimal Balance' }, { key: 'pill_color', value: PURPLE }, { key: 'details', value: JSON.stringify(['Long-term gut health foundation established', 'Consistent energy and immune resilience']) }] },
  ];

  const p2PhaseIds = [];
  for (const p of p2Phases) { const id = await createMetaobject('product_timeline_phase', p.handle, p.fields); if (id) p2PhaseIds.push(id); }

  const p2Faqs = [
    { handle: 'greens-how-long', fields: [{ key: 'question', value: 'When will I notice a difference?' }, { key: 'answer', value: 'Most people feel more energized within the first week. Digestive benefits typically appear within 2-3 weeks of daily use.' }] },
    { handle: 'greens-taste', fields: [{ key: 'question', value: 'Does it taste like grass?' }, { key: 'answer', value: 'Not at all! Our formula has a light, refreshing flavor with hints of natural mint and citrus.' }] },
    { handle: 'greens-bloating', fields: [{ key: 'question', value: 'Will this help with bloating?' }, { key: 'answer', value: 'Yes — our prebiotic fiber blend and digestive enzymes are specifically chosen to reduce bloating and support comfortable digestion.' }] },
    { handle: 'greens-pregnant', fields: [{ key: 'question', value: 'Can I take this while pregnant or nursing?' }, { key: 'answer', value: 'We recommend consulting your healthcare provider before starting any new supplement during pregnancy or while nursing.' }] },
    { handle: 'greens-when-to-take', fields: [{ key: 'question', value: 'What is the best time to take it?' }, { key: 'answer', value: 'We recommend taking it in the morning with or after breakfast for best absorption and sustained energy throughout the day.' }] },
    { handle: 'greens-return-policy', fields: [{ key: 'question', value: "What's your return policy?" }, { key: 'answer', value: "We stand behind our product with a 30-day satisfaction guarantee. If you're not happy, we'll refund your purchase — no questions asked." }] },
  ];

  const p2FaqIds = [];
  for (const f of p2Faqs) { const id = await createMetaobject('faq', f.handle, f.fields); if (id) p2FaqIds.push(id); }

  const p2TimelineGroupId = await createMetaobject('timeline_group', 'greens-timeline', [
    { key: 'title', value: 'Daily Greens Timeline' },
    { key: 'phases', value: JSON.stringify(p2PhaseIds.filter(Boolean)) },
  ]);
  const p2FaqGroupId = await createMetaobject('faq_group', 'greens-faqs', [
    { key: 'title', value: 'Daily Greens FAQs' },
    { key: 'faqs', value: JSON.stringify(p2FaqIds.filter(Boolean)) },
  ]);
  console.log('');

  // Step 5: Set product metafields
  console.log('--- Step 5: Setting Product Metafields ---');
  if (PRODUCT_ID_1) {
    await setProductMetafields(PRODUCT_ID_1, [
      { namespace: 'product_details', key: 'problem_heading', type: 'single_line_text_field', value: 'Most immune supplements only treat symptoms' },
      { namespace: 'product_details', key: 'problem_body', type: 'multi_line_text_field', value: 'Most immune products are built around quick-response ingredients that address symptoms after they appear, rather than supporting the underlying immune processes that determine how your body responds in the first place.' },
      { namespace: 'product_details', key: 'ingredients', type: 'list.metaobject_reference', value: JSON.stringify(p1IngIds.filter(Boolean)) },
      { namespace: 'product_details', key: 'timeline_phases', type: 'metaobject_reference', value: p1TimelineGroupId },
      { namespace: 'product_details', key: 'faqs', type: 'metaobject_reference', value: p1FaqGroupId },
    ]);
  }
  if (PRODUCT_ID_2) {
    await setProductMetafields(PRODUCT_ID_2, [
      { namespace: 'product_details', key: 'problem_heading', type: 'single_line_text_field', value: 'Your gut health is the foundation of everything' },
      { namespace: 'product_details', key: 'problem_body', type: 'multi_line_text_field', value: 'Most greens powders pack in dozens of ingredients at tiny doses, hoping something sticks. Real gut health requires targeted nutrition — prebiotics, adaptogens, and whole-food greens working together at effective levels.' },
      { namespace: 'product_details', key: 'ingredients', type: 'list.metaobject_reference', value: JSON.stringify(p2IngIds.filter(Boolean)) },
      { namespace: 'product_details', key: 'timeline_phases', type: 'metaobject_reference', value: p2TimelineGroupId },
      { namespace: 'product_details', key: 'faqs', type: 'metaobject_reference', value: p2FaqGroupId },
    ]);
  }

  console.log('\n=== Setup Complete ===');
}

main().catch(console.error);
