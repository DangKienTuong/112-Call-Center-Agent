#!/usr/bin/env node

/**
 * RAG System Test Script
 * 
 * Tests the complete RAG pipeline:
 * 1. MongoDB connection
 * 2. Document indexing
 * 3. Retrieval functionality
 * 4. LangGraph integration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DocumentEmbedding = require('../models/DocumentEmbedding');
const retriever = require('../services/langgraph/retriever');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function section(msg) {
  console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`);
}

/**
 * Test 1: MongoDB Connection
 */
async function testMongoConnection() {
  section('Test 1: MongoDB Connection');
  
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      success('MongoDB connected');
      return true;
    } else {
      error(`MongoDB not connected (state: ${state})`);
      return false;
    }
  } catch (err) {
    error(`MongoDB connection test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 2: DocumentEmbedding Model
 */
async function testModel() {
  section('Test 2: DocumentEmbedding Model');
  
  try {
    // Check if model is properly defined
    const modelName = DocumentEmbedding.modelName;
    success(`Model name: ${modelName}`);
    
    // Check schema fields
    const schemaFields = Object.keys(DocumentEmbedding.schema.paths);
    success(`Schema has ${schemaFields.length} fields`);
    info(`   Fields: ${schemaFields.slice(0, 5).join(', ')}...`);
    
    // Check static methods
    const methods = ['getByType', 'getByHash', 'isIndexed', 'deleteByHash', 'getStats'];
    const hasAllMethods = methods.every(m => typeof DocumentEmbedding[m] === 'function');
    
    if (hasAllMethods) {
      success(`All static methods defined: ${methods.join(', ')}`);
    } else {
      error('Some static methods are missing');
      return false;
    }
    
    return true;
  } catch (err) {
    error(`Model test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 3: Document Statistics
 */
async function testStats() {
  section('Test 3: Document Statistics');
  
  try {
    const count = await DocumentEmbedding.countDocuments();
    info(`Total embeddings in database: ${count}`);
    
    if (count === 0) {
      console.log(`${colors.yellow}⚠${colors.reset} No embeddings found. Run indexing first:`);
      console.log('   node scripts/indexDocuments.js');
      return false;
    }
    
    const stats = await DocumentEmbedding.getStats();
    
    stats.forEach(stat => {
      success(`${stat.type}: ${stat.chunkCount} chunks, ${stat.documentCount} documents`);
    });
    
    return true;
  } catch (err) {
    error(`Stats test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 4: Retriever Initialization
 */
async function testRetrieverInit() {
  section('Test 4: Retriever Initialization');
  
  try {
    info('Initializing retriever...');
    await retriever.initialize();
    
    const status = retriever.getStatus();
    
    if (status.initialized) {
      success('Retriever initialized');
    } else {
      error('Retriever not initialized');
      return false;
    }
    
    if (status.hasVectorStore) {
      success('VectorStore created');
    } else {
      error('VectorStore not created');
      return false;
    }
    
    const docTypes = Object.keys(status.documents);
    if (docTypes.length > 0) {
      success(`Document types loaded: ${docTypes.join(', ')}`);
      docTypes.forEach(type => {
        const doc = status.documents[type];
        info(`   ${type}: ${doc.chunkCount || 0} chunks`);
      });
    } else {
      error('No documents loaded');
      return false;
    }
    
    return true;
  } catch (err) {
    error(`Retriever init test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 5: Document Retrieval
 */
async function testRetrieval() {
  section('Test 5: Document Retrieval');
  
  const testQueries = [
    {
      query: 'cách sơ cứu vết thương chảy máu',
      types: ['MEDICAL'],
      description: 'Medical query - bleeding wound'
    },
    {
      query: 'xử lý khi có cháy trong nhà',
      types: ['FIRE_RESCUE'],
      description: 'Fire rescue query - house fire'
    },
    {
      query: 'cấp cứu tai nạn giao thông',
      types: ['MEDICAL'],
      description: 'Medical query - traffic accident'
    }
  ];
  
  let allPassed = true;
  
  for (const test of testQueries) {
    try {
      info(`Testing: ${test.description}`);
      info(`   Query: "${test.query}"`);
      info(`   Types: [${test.types.join(', ')}]`);
      
      const docs = await retriever.retrieve(test.query, test.types, 3);
      
      if (docs && docs.length > 0) {
        success(`   Retrieved ${docs.length} documents`);
        
        // Show first result preview
        const firstDoc = docs[0];
        const preview = firstDoc.pageContent.substring(0, 80).replace(/\n/g, ' ');
        info(`   Preview: "${preview}..."`);
        info(`   Source: ${firstDoc.metadata.source}`);
        
      } else {
        error(`   No documents retrieved`);
        allPassed = false;
      }
      
      console.log('');
    } catch (err) {
      error(`   Retrieval failed: ${err.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Test 6: Embedding Quality Check
 */
async function testEmbeddingQuality() {
  section('Test 6: Embedding Quality Check');
  
  try {
    // Get a sample embedding
    const sample = await DocumentEmbedding.findOne({}).lean();
    
    if (!sample) {
      error('No embeddings to check');
      return false;
    }
    
    // Check embedding dimensions
    if (sample.embedding.length === 1536) {
      success(`Embedding dimensions correct: ${sample.embedding.length}`);
    } else {
      error(`Wrong embedding dimensions: ${sample.embedding.length} (expected 1536)`);
      return false;
    }
    
    // Check if embeddings are normalized (should be roughly between -1 and 1)
    const min = Math.min(...sample.embedding);
    const max = Math.max(...sample.embedding);
    
    if (min >= -2 && max <= 2) {
      success(`Embedding values in valid range: [${min.toFixed(4)}, ${max.toFixed(4)}]`);
    } else {
      error(`Embedding values out of range: [${min.toFixed(4)}, ${max.toFixed(4)}]`);
      return false;
    }
    
    // Check metadata
    const requiredFields = ['source', 'type', 'chunkIndex'];
    const hasAllFields = requiredFields.every(f => sample.metadata[f] !== undefined);
    
    if (hasAllFields) {
      success('All metadata fields present');
      info(`   Source: ${sample.metadata.source}`);
      info(`   Type: ${sample.metadata.type}`);
    } else {
      error('Missing metadata fields');
      return false;
    }
    
    return true;
  } catch (err) {
    error(`Embedding quality test failed: ${err.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     RAG System Integration Test        ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);
  
  const results = {
    mongoConnection: false,
    model: false,
    stats: false,
    retrieverInit: false,
    retrieval: false,
    embeddingQuality: false,
  };
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_112';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Run tests
    results.mongoConnection = await testMongoConnection();
    results.model = await testModel();
    results.stats = await testStats();
    results.retrieverInit = await testRetrieverInit();
    
    // Only run retrieval tests if retriever initialized successfully
    if (results.retrieverInit) {
      results.retrieval = await testRetrieval();
      results.embeddingQuality = await testEmbeddingQuality();
    }
    
  } catch (err) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, err.message);
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
  
  // Print summary
  section('Test Summary');
  
  const tests = [
    ['MongoDB Connection', results.mongoConnection],
    ['DocumentEmbedding Model', results.model],
    ['Document Statistics', results.stats],
    ['Retriever Initialization', results.retrieverInit],
    ['Document Retrieval', results.retrieval],
    ['Embedding Quality', results.embeddingQuality],
  ];
  
  let passedCount = 0;
  tests.forEach(([name, passed]) => {
    if (passed) {
      success(name);
      passedCount++;
    } else {
      error(name);
    }
  });
  
  const total = tests.length;
  console.log(`\n${colors.cyan}Results: ${passedCount}/${total} tests passed${colors.reset}\n`);
  
  if (passedCount === total) {
    console.log(`${colors.green}🎉 All tests passed! RAG system is working correctly.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Please check the errors above.${colors.reset}\n`);
    
    if (!results.stats) {
      console.log(`${colors.yellow}💡 Tip: Run indexing first:${colors.reset}`);
      console.log('   node scripts/indexDocuments.js\n');
    }
    
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
