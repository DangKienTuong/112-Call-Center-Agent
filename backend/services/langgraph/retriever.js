const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Document } = require('@langchain/core/documents');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const DocumentEmbedding = require('../../models/DocumentEmbedding');

/**
 * Document Retriever Service
 * Loads and indexes PDF documents for RAG-based first aid guidance
 * Uses MongoDB for persistent storage of embeddings
 */

class DocumentRetriever {
  constructor() {
    this.vectorStore = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.documentMetadata = {};
    this.embeddings = null;
  }

  /**
   * Calculate hash of a file for change detection
   */
  _calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Initialize the vector store with PDF documents
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._loadAndIndexDocuments();
    await this.initPromise;
  }

  /**
   * Load embeddings from MongoDB into MemoryVectorStore
   */
  async _loadFromMongoDB() {
    try {
      console.log('[Retriever] Loading embeddings from MongoDB...');

      // Get all embeddings from MongoDB
      const embeddingDocs = await DocumentEmbedding.find({}).lean();

      if (embeddingDocs.length === 0) {
        console.log('[Retriever] No embeddings found in MongoDB');
        return false;
      }

      console.log(`[Retriever] Found ${embeddingDocs.length} embeddings in MongoDB`);

      // Initialize embeddings instance if not already done
      if (!this.embeddings) {
        this.embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
          modelName: 'text-embedding-3-small',
        });
      }

      // Convert MongoDB documents to LangChain Document format
      const documents = embeddingDocs.map(doc => new Document({
        pageContent: doc.content,
        metadata: doc.metadata,
      }));

      // Extract embeddings array
      const embeddings = embeddingDocs.map(doc => doc.embedding);

      // Create MemoryVectorStore and manually add the vectors
      this.vectorStore = new MemoryVectorStore(this.embeddings);
      
      // Add existing vectors directly to the store
      for (let i = 0; i < documents.length; i++) {
        this.vectorStore.memoryVectors.push({
          content: documents[i].pageContent,
          embedding: embeddings[i],
          metadata: documents[i].metadata,
        });
      }

      // Build metadata summary
      const stats = await DocumentEmbedding.getStats();
      stats.forEach(stat => {
        this.documentMetadata[stat.type] = {
          loaded: true,
          chunkCount: stat.chunkCount,
          documentCount: stat.documentCount,
        };
      });

      console.log('[Retriever] ✓ Loaded embeddings from MongoDB into VectorStore');
      console.log('[Retriever] Stats:', this.documentMetadata);

      return true;

    } catch (error) {
      console.error('[Retriever] Error loading from MongoDB:', error);
      return false;
    }
  }

  /**
   * Index documents into MongoDB
   * Prefers OCR text files if available, falls back to PDF extraction
   */
  async _indexDocuments() {
    try {
      console.log('[Retriever] Starting document indexing...');

      const documentsPath = path.join(__dirname, '../../../reference_document');
      const ocrOutputPath = path.join(documentsPath, 'ocr_output');
      console.log('[Retriever] Looking for documents in:', documentsPath);
      console.log('[Retriever] OCR output directory:', ocrOutputPath);

      // Initialize embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small',
      });

      // Text splitter with optimized settings for Vietnamese medical documents
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const documentsToIndex = [
        {
          pdfPath: path.join(documentsPath, 'Cam-nang-PCCC-trong-gia-dinh.pdf'),
          ocrPath: path.join(ocrOutputPath, 'Cam-nang-PCCC-trong-gia-dinh_ocr.txt'),
          type: 'FIRE_RESCUE',
          name: 'Cẩm nang PCCC trong gia đình',
        },
        {
          pdfPath: path.join(documentsPath, 'tai-lieu-so-cap-cuu.pdf'),
          ocrPath: path.join(ocrOutputPath, 'tai-lieu-so-cap-cuu_ocr.txt'),
          type: 'MEDICAL',
          name: 'Tài liệu sơ cấp cứu',
        }
      ];

      let totalIndexed = 0;

      for (const docInfo of documentsToIndex) {
        // Determine which file to use (OCR text preferred over PDF)
        const useOCR = fs.existsSync(docInfo.ocrPath);
        const sourcePath = useOCR ? docInfo.ocrPath : docInfo.pdfPath;
        
        if (!fs.existsSync(sourcePath)) {
          console.warn(`[Retriever] ✗ Document not found: ${sourcePath}`);
          continue;
        }

        try {
          // Calculate file hash
          const fileHash = this._calculateFileHash(sourcePath);
          
          // Check if already indexed
          const isIndexed = await DocumentEmbedding.isIndexed(fileHash);
          
          if (isIndexed) {
            console.log(`[Retriever] ✓ ${docInfo.name} already indexed (hash: ${fileHash.substring(0, 8)}...)`);
            const count = await DocumentEmbedding.countDocuments({ documentHash: fileHash });
            this.documentMetadata[docInfo.type] = {
              path: sourcePath,
              name: docInfo.name,
              loaded: true,
              chunkCount: count,
              hash: fileHash,
              useOCR: useOCR,
            };
            continue;
          }

          console.log(`[Retriever] Indexing ${docInfo.name}...`);
          console.log(`[Retriever]   Source: ${useOCR ? 'OCR text file' : 'PDF file'}`);

          let docs = [];
          
          if (useOCR) {
            // Load OCR text file
            const textContent = fs.readFileSync(docInfo.ocrPath, 'utf-8');
            console.log(`[Retriever]   Loaded ${textContent.length} characters from OCR file`);
            
            // Split by page markers if present, otherwise treat as single document
            const pageRegex = /=== TRANG (\d+) ===/g;
            const pages = textContent.split(pageRegex).filter(s => s.trim());
            
            if (pages.length > 1) {
              // Has page markers
              let pageNum = 0;
              for (let i = 0; i < pages.length; i++) {
                const content = pages[i].trim();
                if (/^\d+$/.test(content)) {
                  pageNum = parseInt(content);
                } else if (content.length > 50) {
                  docs.push(new Document({
                    pageContent: content,
                    metadata: {
                      source: docInfo.name,
                      type: docInfo.type,
                      page: pageNum,
                      fromOCR: true,
                    }
                  }));
                }
              }
            } else {
              // Single document without page markers
              docs.push(new Document({
                pageContent: textContent,
                metadata: {
                  source: docInfo.name,
                  type: docInfo.type,
                  fromOCR: true,
                }
              }));
            }
            console.log(`[Retriever]   Created ${docs.length} page documents`);
          } else {
            // Load PDF using PDFLoader
            const loader = new PDFLoader(docInfo.pdfPath);
            docs = await loader.load();
            console.log(`[Retriever]   Loaded ${docs.length} pages from PDF`);

            // Add metadata
            docs.forEach(doc => {
              doc.metadata = {
                ...doc.metadata,
                source: docInfo.name,
                type: docInfo.type,
                fromOCR: false,
              };
            });
          }

          // Split into chunks
          const splitDocs = await textSplitter.splitDocuments(docs);
          console.log(`[Retriever]   Created ${splitDocs.length} chunks`);

          // Generate embeddings
          console.log(`[Retriever]   Generating embeddings...`);
          const texts = splitDocs.map(doc => doc.pageContent);
          const embeddings = await this.embeddings.embedDocuments(texts);
          console.log(`[Retriever]   Generated ${embeddings.length} embeddings`);

          // Save to MongoDB
          console.log(`[Retriever]   Saving to MongoDB...`);
          const embeddingDocs = splitDocs.map((doc, idx) => ({
            content: doc.pageContent,
            embedding: embeddings[idx],
            metadata: {
              source: doc.metadata.source,
              type: doc.metadata.type,
              page: doc.metadata.page || doc.metadata.loc?.pageNumber,
              chunkIndex: idx,
              fromOCR: doc.metadata.fromOCR || false,
            },
            documentHash: fileHash,
          }));

          await DocumentEmbedding.insertMany(embeddingDocs);
          console.log(`[Retriever] ✓ ${docInfo.name} indexed successfully (${embeddingDocs.length} chunks)`);

          this.documentMetadata[docInfo.type] = {
            path: sourcePath,
            name: docInfo.name,
            loaded: true,
            chunkCount: embeddingDocs.length,
            hash: fileHash,
            useOCR: useOCR,
          };

          totalIndexed += embeddingDocs.length;

        } catch (err) {
          console.error(`[Retriever] ✗ Error indexing ${docInfo.name}:`, err.message);
        }
      }

      console.log(`[Retriever] ✓ Indexing complete. Total chunks indexed: ${totalIndexed}`);
      return totalIndexed > 0;

    } catch (error) {
      console.error('[Retriever] Error indexing documents:', error);
      return false;
    }
  }

  async _loadAndIndexDocuments() {
    try {
      console.log('[Retriever] Initializing document retriever...');

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn('[Retriever] OpenAI API key not configured. RAG will not be available.');
        this.isInitialized = true;
        return;
      }

      // Try to load from MongoDB first
      const loadedFromDB = await this._loadFromMongoDB();

      if (loadedFromDB) {
        console.log('[Retriever] ✓ Loaded from MongoDB successfully');
      } else {
        console.log('[Retriever] MongoDB empty, indexing documents...');
        const indexed = await this._indexDocuments();
        
        if (indexed) {
          // Load the newly indexed documents
          await this._loadFromMongoDB();
        } else {
          console.warn('[Retriever] No documents indexed. RAG will not be available.');
        }
      }

      this.isInitialized = true;
      console.log('[Retriever] ✓ Document retriever initialized successfully');
      console.log('[Retriever] Available document types:', Object.keys(this.documentMetadata));

    } catch (error) {
      console.error('[Retriever] Error initializing document retriever:', error);
      this.isInitialized = true; // Set to true to prevent retry loops
    }
  }

  /**
   * Retrieve relevant documents for a query
   * @param {string} query - The search query
   * @param {Array<string>} emergencyTypes - Filter by emergency types
   * @param {number} k - Number of documents to retrieve
   */
  async retrieve(query, emergencyTypes = [], k = 3) {
    await this.initialize();

    if (!this.vectorStore) {
      console.log('[Retriever] Vector store not available');
      return [];
    }

    try {
      console.log('[Retriever] Retrieving documents for query:', query.substring(0, 100) + '...');
      console.log('[Retriever] Filtering by types:', emergencyTypes);

      // Retrieve documents
      const results = await this.vectorStore.similaritySearch(query, k * 2); // Get more results to filter

      // Filter by emergency type if specified
      let filteredResults = results;
      if (emergencyTypes && emergencyTypes.length > 0) {
        filteredResults = results.filter(doc => 
          emergencyTypes.includes(doc.metadata.type)
        );
      }

      // Limit to k results
      filteredResults = filteredResults.slice(0, k);

      console.log(`[Retriever] Retrieved ${filteredResults.length} relevant documents`);
      return filteredResults;

    } catch (error) {
      console.error('[Retriever] Error retrieving documents:', error);
      return [];
    }
  }

  /**
   * Force re-index all documents (useful for updates)
   */
  async reindexAll() {
    console.log('[Retriever] Starting full re-index...');
    
    try {
      // Clear all existing embeddings
      await DocumentEmbedding.deleteMany({});
      console.log('[Retriever] Cleared existing embeddings');

      // Reset state
      this.vectorStore = null;
      this.documentMetadata = {};

      // Re-index
      await this._indexDocuments();
      await this._loadFromMongoDB();

      console.log('[Retriever] ✓ Re-index complete');
      return true;

    } catch (error) {
      console.error('[Retriever] Error during re-index:', error);
      return false;
    }
  }

  /**
   * Get retriever status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasVectorStore: this.vectorStore !== null,
      documents: this.documentMetadata,
    };
  }
}

// Export singleton instance
const retriever = new DocumentRetriever();

module.exports = retriever;
