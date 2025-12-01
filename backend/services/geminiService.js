/**
 * Gemini File Search Service
 *
 * Uses Google Gemini's File Search API for semantic search in reference documents.
 * Based on: https://ai.google.dev/gemini-api/docs/file-search
 *
 * This service:
 * 1. Creates File Search Stores for each document type
 * 2. Uploads and indexes PDF documents
 * 3. Queries documents using semantic search for first aid guidance
 */

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class GeminiService {
  constructor() {
    this.ai = null;
    this.fileSearchStores = {
      FIRE_RESCUE: null,
      MEDICAL: null
    };
    this.isInitialized = false;
    this.initPromise = null;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Start initialization but don't block constructor
      this.initPromise = this.initializeFileSearchStores();
    } else {
      console.warn('Gemini API key not configured. First aid guidance will use fallback responses.');
    }
  }

  /**
   * Initialize File Search Stores and upload documents
   */
  async initializeFileSearchStores() {
    try {
      console.log('Initializing Gemini File Search Stores...');

      const documentsPath = path.join(__dirname, '../../reference_document');

      // Initialize FIRE_RESCUE store with PCCC document
      const pcccPath = path.join(documentsPath, 'Cam-nang-PCCC-trong-gia-dinh.pdf');
      if (fs.existsSync(pcccPath)) {
        await this.createOrGetStore('FIRE_RESCUE', 'PCCC-Guide-Store', pcccPath, 'Cam nang PCCC trong gia dinh');
      } else {
        console.warn('PCCC document not found at:', pcccPath);
      }

      // Initialize MEDICAL store with First Aid document
      const medicalPath = path.join(documentsPath, 'tai-lieu-so-cap-cuu.pdf');
      if (fs.existsSync(medicalPath)) {
        await this.createOrGetStore('MEDICAL', 'FirstAid-Guide-Store', medicalPath, 'Tai lieu so cap cuu');
      } else {
        console.warn('Medical document not found at:', medicalPath);
      }

      this.isInitialized = true;
      console.log('Gemini File Search Stores initialized successfully');

    } catch (error) {
      console.error('Error initializing Gemini File Search Stores:', error);
      this.isInitialized = true; // Mark as initialized to prevent blocking
    }
  }

  /**
   * Create or get existing File Search Store and upload document
   */
  async createOrGetStore(storeType, storeName, filePath, displayName) {
    try {
      console.log(`Setting up File Search Store: ${storeName}`);

      // Try to find existing store first
      let existingStore = null;
      try {
        const stores = await this.ai.fileSearchStores.list();
        if (stores && stores.fileSearchStores) {
          existingStore = stores.fileSearchStores.find(s =>
            s.displayName === storeName && s.state === 'ACTIVE'
          );
        }
      } catch (listErr) {
        console.log('Could not list existing stores, will create new one');
      }

      if (existingStore) {
        console.log(`Found existing store: ${existingStore.name}`);
        this.fileSearchStores[storeType] = existingStore;
        return existingStore;
      }

      // Create new File Search Store
      console.log(`Creating new File Search Store: ${storeName}`);
      const createStoreOp = await this.ai.fileSearchStores.create({
        config: {
          displayName: storeName,
          description: `Emergency 112 reference document store for ${storeType}`
        }
      });

      // Wait for store creation to complete
      let store = createStoreOp;
      if (createStoreOp.name && !createStoreOp.state) {
        // Poll for completion if it's an operation
        store = await this.waitForOperation(createStoreOp);
      }

      console.log(`Store created: ${store.name}`);

      // Upload document to the store
      await this.uploadDocumentToStore(store.name, filePath, displayName);

      this.fileSearchStores[storeType] = store;
      return store;

    } catch (error) {
      console.error(`Error creating store ${storeName}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload a document to a File Search Store
   */
  async uploadDocumentToStore(storeName, filePath, displayName) {
    try {
      console.log(`Uploading document to store: ${displayName}`);

      // Upload and index the file
      let uploadOp = await this.ai.fileSearchStores.uploadToFileSearchStore({
        file: filePath,
        fileSearchStoreName: storeName,
        config: {
          displayName: displayName,
          customMetadata: [
            { key: 'document_type', stringValue: 'emergency_guide' },
            { key: 'language', stringValue: 'vietnamese' }
          ]
        }
      });

      // Wait for processing to complete
      while (!uploadOp.done) {
        console.log(`Processing document: ${displayName}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        uploadOp = await this.ai.operations.get({ operation: uploadOp });
      }

      console.log(`Document uploaded and indexed: ${displayName}`);
      return uploadOp;

    } catch (error) {
      console.error(`Error uploading document ${displayName}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for an operation to complete
   */
  async waitForOperation(operation) {
    let result = operation;
    while (!result.done && result.name) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await this.ai.operations.get({ operation: result });
    }
    return result.response || result;
  }

  /**
   * Get first aid guidance using File Search
   */
  async getFirstAidGuidance(emergencyType, description) {
    // If Gemini is not configured, return fallback
    if (!this.ai) {
      return this.getFallbackGuidance(emergencyType);
    }

    // Wait for initialization if still in progress
    if (this.initPromise && !this.isInitialized) {
      try {
        await this.initPromise;
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }

    try {
      // Get the appropriate store
      const store = this.fileSearchStores[emergencyType];

      if (!store) {
        console.log(`No File Search Store available for: ${emergencyType}`);
        return this.getFallbackGuidance(emergencyType);
      }

      // Build the search query
      const searchQuery = this.buildSearchQuery(emergencyType, description);

      console.log(`Querying File Search Store for: ${emergencyType}`);

      // Use generateContent with fileSearch tool
      const response = await this.ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: searchQuery }]
          }
        ],
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [store.name]
              }
            }
          ]
        }
      });

      // Extract the text response
      const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        return this.getFallbackGuidance(emergencyType);
      }

      // Check if guidance was found
      if (textResponse.includes('KHÔNG_TÌM_THẤY') ||
          textResponse.includes('không có trong tài liệu') ||
          textResponse.includes('không tìm thấy hướng dẫn')) {
        return 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý. Không tự ý thực hiện các biện pháp nếu không chắc chắn.';
      }

      return this.formatGuidance(textResponse);

    } catch (error) {
      console.error('Error querying File Search:', error);
      return this.getFallbackGuidance(emergencyType);
    }
  }

  /**
   * Build search query for the situation
   */
  buildSearchQuery(emergencyType, description) {
    const situationDesc = description || this.getDefaultDescription(emergencyType);

    return `Bạn là chuyên gia tư vấn khẩn cấp của tổng đài 112 Việt Nam.

TÌNH HUỐNG KHẨN CẤP: "${situationDesc}"

HÃY TÌM KIẾM trong tài liệu tham khảo và trả lời:

1. Tìm hướng dẫn xử lý ban đầu tại chỗ phù hợp với tình huống này
2. Nếu TÌM THẤY hướng dẫn: Liệt kê các bước xử lý ngắn gọn (tối đa 5 bước)
3. Nếu KHÔNG TÌM THẤY hướng dẫn phù hợp: Trả lời "KHÔNG_TÌM_THẤY"

YÊU CẦU:
- CHỈ đưa ra hướng dẫn có trong tài liệu tham khảo
- Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu
- Ưu tiên an toàn của người dùng
- Format dạng danh sách bullet points`;
  }

  /**
   * Get default description based on emergency type
   */
  getDefaultDescription(emergencyType) {
    const descriptions = {
      'FIRE_RESCUE': 'Hỏa hoạn, cháy nổ trong nhà ở',
      'MEDICAL': 'Cấp cứu y tế, người bị thương hoặc bệnh nặng',
      'SECURITY': 'Vấn đề an ninh trật tự'
    };
    return descriptions[emergencyType] || 'Tình huống khẩn cấp';
  }

  /**
   * Format the guidance response
   */
  formatGuidance(response) {
    if (!response) {
      return 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.';
    }

    let formatted = response.trim();

    // Remove markdown code blocks
    formatted = formatted.replace(/```[\s\S]*?```/g, '');

    // Clean up excessive whitespace
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted.trim();
  }

  /**
   * Fallback guidance when File Search is unavailable
   */
  getFallbackGuidance(emergencyType) {
    const guidance = {
      'FIRE_RESCUE': `⚠️ **Trong khi chờ lực lượng PCCC:**
• Di chuyển ra khỏi khu vực nguy hiểm ngay lập tức
• Đóng cửa phòng có đám cháy để hạn chế khói lan
• Di chuyển sát mặt đất nếu có nhiều khói
• KHÔNG sử dụng thang máy
• Chờ lực lượng PCCC đến xử lý`,

      'MEDICAL': `⚠️ **Trong khi chờ xe cấp cứu:**
• Đảm bảo an toàn cho bản thân trước
• Không di chuyển nạn nhân nếu nghi chấn thương cột sống
• Nếu chảy máu: Dùng vải sạch ép chặt vết thương
• Giữ nạn nhân ấm và trấn an
• Chờ nhân viên y tế đến xử lý`,

      'SECURITY': `⚠️ **Trong khi chờ công an:**
• Đảm bảo an toàn bản thân là ưu tiên hàng đầu
• Di chuyển đến nơi an toàn nếu có thể
• Không đối đầu trực tiếp với đối tượng nguy hiểm
• Ghi nhớ đặc điểm nhận dạng nếu an toàn
• Chờ lực lượng công an đến xử lý`
    };

    return guidance[emergencyType] ||
      'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý. Đảm bảo an toàn cho bản thân và những người xung quanh.';
  }

  /**
   * List all File Search Stores (for debugging)
   */
  async listStores() {
    try {
      const stores = await this.ai.fileSearchStores.list();
      return stores;
    } catch (error) {
      console.error('Error listing stores:', error);
      return [];
    }
  }

  /**
   * Delete a File Search Store (cleanup)
   */
  async deleteStore(storeName) {
    try {
      await this.ai.fileSearchStores.delete({
        name: storeName,
        config: { force: true }
      });
      console.log('Deleted store:', storeName);
    } catch (error) {
      console.error('Error deleting store:', error);
    }
  }

  /**
   * Cleanup all stores (use carefully)
   */
  async cleanupAllStores() {
    try {
      const stores = await this.listStores();
      if (stores && stores.fileSearchStores) {
        for (const store of stores.fileSearchStores) {
          await this.deleteStore(store.name);
        }
      }
      console.log('All stores cleaned up');
    } catch (error) {
      console.error('Error cleaning up stores:', error);
    }
  }
}

module.exports = new GeminiService();
