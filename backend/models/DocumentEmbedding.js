const mongoose = require('mongoose');

/**
 * Document Embedding Model
 * Stores document chunks with their embeddings for RAG retrieval
 */

const documentEmbeddingSchema = new mongoose.Schema({
  // The actual text content of the chunk
  content: {
    type: String,
    required: true,
    index: 'text', // Text search index
  },

  // The embedding vector (1536 dimensions for text-embedding-3-small)
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length === 1536;
      },
      message: 'Embedding must be an array of 1536 numbers'
    }
  },

  // Metadata about the document chunk
  metadata: {
    source: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['FIRE_RESCUE', 'MEDICAL', 'SECURITY'],
      required: true,
    },
    page: {
      type: Number,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    // Original PDF metadata
    pdf: {
      totalPages: Number,
      info: mongoose.Schema.Types.Mixed,
    }
  },

  // Hash of the source document to detect changes
  documentHash: {
    type: String,
    required: true,
    index: true,
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  }
});

// Compound indexes for efficient querying
documentEmbeddingSchema.index({ 'metadata.type': 1, createdAt: -1 });
documentEmbeddingSchema.index({ documentHash: 1, 'metadata.chunkIndex': 1 });

// Static method to get all embeddings by type
documentEmbeddingSchema.statics.getByType = function(type) {
  return this.find({ 'metadata.type': type }).sort({ 'metadata.chunkIndex': 1 });
};

// Static method to get all embeddings for a document hash
documentEmbeddingSchema.statics.getByHash = function(hash) {
  return this.find({ documentHash: hash }).sort({ 'metadata.chunkIndex': 1 });
};

// Static method to check if a document is already indexed
documentEmbeddingSchema.statics.isIndexed = async function(hash) {
  const count = await this.countDocuments({ documentHash: hash });
  return count > 0;
};

// Static method to delete all embeddings for a document
documentEmbeddingSchema.statics.deleteByHash = function(hash) {
  return this.deleteMany({ documentHash: hash });
};

// Static method to get embedding statistics
documentEmbeddingSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$metadata.type',
        count: { $sum: 1 },
        documents: { $addToSet: '$documentHash' }
      }
    }
  ]);

  return stats.map(s => ({
    type: s._id,
    chunkCount: s.count,
    documentCount: s.documents.length
  }));
};

module.exports = mongoose.model('DocumentEmbedding', documentEmbeddingSchema);




