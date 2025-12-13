const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const path = require('path');
const fs = require('fs');

/**
 * Document Retriever Service
 * Loads and indexes PDF documents for RAG-based first aid guidance
 * Replaces the OpenAI Assistants API from the old system
 */

class DocumentRetriever {
  constructor() {
    this.vectorStore = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.documentMetadata = {};
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

  async _loadAndIndexDocuments() {
    try {
      console.log('[Retriever] Initializing document retriever...');

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn('[Retriever] OpenAI API key not configured. RAG will not be available.');
        this.isInitialized = true;
        return;
      }

      const documentsPath = path.join(__dirname, '../../../reference_document');
      console.log('[Retriever] Looking for documents in:', documentsPath);

      const allDocuments = [];

      // Load PCCC (Fire/Rescue) document
      const pcccPath = path.join(documentsPath, 'Cam-nang-PCCC-trong-gia-dinh.pdf');
      if (fs.existsSync(pcccPath)) {
        try {
          console.log('[Retriever] Loading PCCC document...');
          const loader = new PDFLoader(pcccPath);
          const docs = await loader.load();
          
          // Add metadata to identify document type
          docs.forEach(doc => {
            doc.metadata = {
              ...doc.metadata,
              source: 'Cẩm nang PCCC trong gia đình',
              type: 'FIRE_RESCUE',
            };
          });
          
          allDocuments.push(...docs);
          this.documentMetadata['FIRE_RESCUE'] = {
            path: pcccPath,
            name: 'Cẩm nang PCCC trong gia đình',
            loaded: true,
            documentCount: docs.length,
          };
          console.log(`[Retriever] ✓ Loaded ${docs.length} pages from PCCC document`);
        } catch (err) {
          console.error('[Retriever] ✗ Error loading PCCC document:', err.message);
        }
      } else {
        console.warn('[Retriever] ✗ PCCC document not found at:', pcccPath);
      }

      // Load Medical/First Aid document
      const medicalPath = path.join(documentsPath, 'tai-lieu-so-cap-cuu.pdf');
      if (fs.existsSync(medicalPath)) {
        try {
          console.log('[Retriever] Loading Medical document...');
          const loader = new PDFLoader(medicalPath);
          const docs = await loader.load();
          
          // Add metadata to identify document type
          docs.forEach(doc => {
            doc.metadata = {
              ...doc.metadata,
              source: 'Tài liệu sơ cấp cứu',
              type: 'MEDICAL',
            };
          });
          
          allDocuments.push(...docs);
          this.documentMetadata['MEDICAL'] = {
            path: medicalPath,
            name: 'Tài liệu sơ cấp cứu',
            loaded: true,
            documentCount: docs.length,
          };
          console.log(`[Retriever] ✓ Loaded ${docs.length} pages from Medical document`);
        } catch (err) {
          console.error('[Retriever] ✗ Error loading Medical document:', err.message);
        }
      } else {
        console.warn('[Retriever] ✗ Medical document not found at:', medicalPath);
      }

      if (allDocuments.length === 0) {
        console.warn('[Retriever] No documents loaded. RAG will not be available.');
        this.isInitialized = true;
        return;
      }

      // Split documents into chunks
      console.log('[Retriever] Splitting documents into chunks...');
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await textSplitter.splitDocuments(allDocuments);
      console.log(`[Retriever] Created ${splitDocs.length} chunks from ${allDocuments.length} documents`);

      // Create vector store with embeddings
      console.log('[Retriever] Creating vector store with embeddings...');
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      this.vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings
      );

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
      console.log('[Retriever] Retrieving documents for query:', query);
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

