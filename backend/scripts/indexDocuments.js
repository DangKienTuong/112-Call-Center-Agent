#!/usr/bin/env node

/**
 * Document Indexing Script
 * 
 * This script indexes PDF documents from the reference_document folder
 * and stores their embeddings in MongoDB for RAG retrieval.
 * 
 * Usage:
 *   node scripts/indexDocuments.js           # Index new/changed documents only
 *   node scripts/indexDocuments.js --force   # Re-index all documents
 *   node scripts/indexDocuments.js --stats   # Show indexing statistics
 *   node scripts/indexDocuments.js --clear   # Clear all embeddings
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DocumentEmbedding = require('../models/DocumentEmbedding');
const retriever = require('../services/langgraph/retriever');

// Parse command line arguments
const args = process.argv.slice(2);
const forceReindex = args.includes('--force') || args.includes('-f');
const showStats = args.includes('--stats') || args.includes('-s');
const clearAll = args.includes('--clear') || args.includes('-c');

/**
 * Display statistics about indexed documents
 */
async function displayStats() {
  try {
    console.log('\n=== Document Embedding Statistics ===\n');

    const stats = await DocumentEmbedding.getStats();
    
    if (stats.length === 0) {
      console.log('No documents indexed yet.\n');
      return;
    }

    let totalChunks = 0;
    let totalDocuments = 0;

    stats.forEach(stat => {
      console.log(`📄 ${stat.type}:`);
      console.log(`   - Chunks: ${stat.chunkCount}`);
      console.log(`   - Documents: ${stat.documentCount}`);
      console.log('');
      
      totalChunks += stat.chunkCount;
      totalDocuments += stat.documentCount;
    });

    console.log(`📊 Total:`);
    console.log(`   - Chunks: ${totalChunks}`);
    console.log(`   - Documents: ${totalDocuments}`);
    console.log('');

    // Get sample documents
    const samples = await DocumentEmbedding.find({})
      .limit(3)
      .select('metadata.source metadata.type content createdAt')
      .lean();

    if (samples.length > 0) {
      console.log('📝 Sample chunks:\n');
      samples.forEach((sample, idx) => {
        const preview = sample.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`${idx + 1}. [${sample.metadata.type}] ${sample.metadata.source}`);
        console.log(`   "${preview}..."`);
        console.log(`   Indexed: ${new Date(sample.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error displaying stats:', error);
    throw error;
  }
}

/**
 * Clear all embeddings from MongoDB
 */
async function clearEmbeddings() {
  try {
    console.log('\n⚠️  Warning: This will delete all indexed embeddings!\n');
    
    // In a real scenario, you might want to add a confirmation prompt
    // For automation, we'll proceed directly
    
    const result = await DocumentEmbedding.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} embeddings\n`);

  } catch (error) {
    console.error('Error clearing embeddings:', error);
    throw error;
  }
}

/**
 * Index documents
 */
async function indexDocuments() {
  try {
    console.log('\n=== Starting Document Indexing ===\n');

    if (forceReindex) {
      console.log('🔄 Force re-index mode enabled\n');
      await retriever.reindexAll();
    } else {
      console.log('📚 Indexing new/changed documents only\n');
      await retriever.initialize();
    }

    console.log('\n✓ Indexing complete!\n');

    // Show stats after indexing
    await displayStats();

  } catch (error) {
    console.error('Error during indexing:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  let exitCode = 0;

  try {
    // Check environment
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Error: OPENAI_API_KEY not set in environment');
      console.error('   Please set it in your .env file\n');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency_112';
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✓ Connected to MongoDB\n');

    // Execute requested operation
    if (clearAll) {
      await clearEmbeddings();
    } else if (showStats) {
      await displayStats();
    } else {
      await indexDocuments();
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:', error.stack);
    }
    exitCode = 1;

  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    
    process.exit(exitCode);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { indexDocuments, displayStats, clearEmbeddings };





