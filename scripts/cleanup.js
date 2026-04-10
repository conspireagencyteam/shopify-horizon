import 'dotenv/config';
import { getAccessToken } from './auth.js';

const STORE_URL = process.env.SHOPIFY_STORE_URL;
const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;

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

async function deleteAllMetaobjectsOfType(type) {
  console.log(`Deleting all ${type} metaobjects...`);
  let hasNext = true;
  let cursor = null;
  let total = 0;

  while (hasNext) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const data = await shopifyGraphQL(`
      query {
        metaobjects(type: "${type}", first: 50${afterClause}) {
          nodes { id handle }
          pageInfo { hasNextPage endCursor }
        }
      }
    `);

    const { nodes, pageInfo } = data.metaobjects;
    if (nodes.length === 0) break;

    for (const obj of nodes) {
      await shopifyGraphQL(`
        mutation Delete($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors { field message }
          }
        }
      `, { id: obj.id });
      total++;
    }

    hasNext = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }

  console.log(`  -> Deleted ${total} entries.`);
}

async function deleteMetaobjectDefinition(type) {
  console.log(`Deleting metaobject definition: ${type}...`);
  const data = await shopifyGraphQL(`
    query {
      metaobjectDefinitionByType(type: "${type}") { id }
    }
  `);
  const id = data.metaobjectDefinitionByType?.id;
  if (!id) {
    console.log(`  -> Not found.`);
    return;
  }
  await shopifyGraphQL(`
    mutation Delete($id: ID!) {
      metaobjectDefinitionDelete(id: $id) {
        deletedId
        userErrors { field message }
      }
    }
  `, { id });
  console.log(`  -> Deleted.`);
}

async function deleteMetafieldDefinition(namespace, key) {
  console.log(`Deleting metafield definition: ${namespace}.${key}...`);
  const data = await shopifyGraphQL(`
    query {
      metafieldDefinitions(namespace: "${namespace}", ownerType: PRODUCT, first: 50) {
        nodes { id key }
      }
    }
  `);
  const def = data.metafieldDefinitions.nodes.find(d => d.key === key);
  if (!def) {
    console.log(`  -> Not found.`);
    return;
  }
  await shopifyGraphQL(`
    mutation Delete($id: ID!, $deleteAll: Boolean!) {
      metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAll) {
        deletedDefinitionId
        userErrors { field message }
      }
    }
  `, { id: def.id, deleteAll: true });
  console.log(`  -> Deleted.`);
}

async function main() {
  console.log('=== FULL CLEANUP ===\n');
  ACCESS_TOKEN = await getAccessToken(STORE_URL, API_KEY, API_SECRET);

  // 1. Delete all metaobject entries (groups first, then items)
  console.log('--- Deleting metaobject entries ---');
  await deleteAllMetaobjectsOfType('faq_group');
  await deleteAllMetaobjectsOfType('timeline_group');
  await deleteAllMetaobjectsOfType('faq');
  await deleteAllMetaobjectsOfType('product_timeline_phase');
  await deleteAllMetaobjectsOfType('product_ingredient');

  // 2. Delete metaobject definitions
  console.log('\n--- Deleting metaobject definitions ---');
  await deleteMetaobjectDefinition('faq_group');
  await deleteMetaobjectDefinition('timeline_group');
  await deleteMetaobjectDefinition('faq');
  await deleteMetaobjectDefinition('product_timeline_phase');
  await deleteMetaobjectDefinition('product_ingredient');

  // 3. Delete metafield definitions
  console.log('\n--- Deleting metafield definitions ---');
  await deleteMetafieldDefinition('product_details', 'problem_heading');
  await deleteMetafieldDefinition('product_details', 'problem_body');
  await deleteMetafieldDefinition('product_details', 'problem_image');
  await deleteMetafieldDefinition('product_details', 'ingredients');
  await deleteMetafieldDefinition('product_details', 'timeline_phases');
  await deleteMetafieldDefinition('product_details', 'faqs');

  console.log('\n=== FULL CLEANUP COMPLETE ===');
}

main().catch(console.error);
