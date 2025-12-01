const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class GeminiService {
  constructor() {
    this.genAI = null;
    this.fileManager = null;
    this.uploadedFiles = {};
    this.isInitialized = false;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
      this.initializeDocuments();
    } else {
      console.warn('Gemini API key not configured. First aid guidance will not be available.');
    }
  }

  // Initialize and upload reference documents
  async initializeDocuments() {
    try {
      const documentsPath = path.join(__dirname, '../../reference_document');

      // Upload Fire/Rescue document - Cẩm nang PCCC
      const pcccPath = path.join(documentsPath, 'Cam-nang-PCCC-trong-gia-dinh.pdf');
      if (fs.existsSync(pcccPath)) {
        try {
          const pcccFile = await this.fileManager.uploadFile(pcccPath, {
            mimeType: 'application/pdf',
            displayName: 'Cam nang PCCC trong gia dinh'
          });
          this.uploadedFiles['FIRE_RESCUE'] = pcccFile.file;
          console.log('Uploaded PCCC document:', pcccFile.file.name);
        } catch (err) {
          console.error('Error uploading PCCC document:', err.message);
        }
      } else {
        console.warn('PCCC document not found at:', pcccPath);
      }

      // Upload Medical/First Aid document - Tài liệu sơ cấp cứu
      const medicalPath = path.join(documentsPath, 'tai-lieu-so-cap-cuu.pdf');
      if (fs.existsSync(medicalPath)) {
        try {
          const medicalFile = await this.fileManager.uploadFile(medicalPath, {
            mimeType: 'application/pdf',
            displayName: 'Tai lieu so cap cuu'
          });
          this.uploadedFiles['MEDICAL'] = medicalFile.file;
          console.log('Uploaded Medical document:', medicalFile.file.name);
        } catch (err) {
          console.error('Error uploading Medical document:', err.message);
        }
      } else {
        console.warn('Medical document not found at:', medicalPath);
      }

      this.isInitialized = true;
      console.log('Gemini service initialized with reference documents');
    } catch (error) {
      console.error('Error initializing Gemini documents:', error);
    }
  }

  // Get first aid guidance based on emergency types and description
  // emergencyTypes can be a string or array of types
  async getFirstAidGuidance(emergencyTypes, description) {
    // Normalize emergencyTypes to array
    const types = Array.isArray(emergencyTypes) ? emergencyTypes : [emergencyTypes];

    // If Gemini is not configured, return no guidance message
    if (!this.genAI) {
      return this.getNoGuidanceMessage();
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      });

      // Collect relevant documents based on emergency types
      const filesToQuery = [];
      const documentNames = [];

      if (types.includes('FIRE_RESCUE') && this.uploadedFiles['FIRE_RESCUE']) {
        filesToQuery.push(this.uploadedFiles['FIRE_RESCUE']);
        documentNames.push('Cẩm nang PCCC trong gia đình');
      }

      if (types.includes('MEDICAL') && this.uploadedFiles['MEDICAL']) {
        filesToQuery.push(this.uploadedFiles['MEDICAL']);
        documentNames.push('Tài liệu sơ cấp cứu');
      }

      // For SECURITY type, we don't have a reference document
      // Only provide guidance if there's also MEDICAL or FIRE_RESCUE involved
      if (types.includes('SECURITY') && filesToQuery.length === 0) {
        return this.getNoGuidanceMessage();
      }

      // If no documents available, return no guidance
      if (filesToQuery.length === 0) {
        return this.getNoGuidanceMessage();
      }

      // Build the strict prompt
      const prompt = `Bạn là tổng đài viên 112. Người dùng đang gặp tình huống khẩn cấp.

**MÔ TẢ TÌNH HUỐNG CỦA NGƯỜI DÙNG:**
"${description || 'Không có mô tả chi tiết'}"

**NHIỆM VỤ CỦA BẠN:**
Tìm trong tài liệu tham khảo (${documentNames.join(', ')}) xem có hướng dẫn xử lý ban đầu phù hợp với tình huống này không.

**QUY TẮC BẮT BUỘC:**
1. CHỈ ĐƯỢC trích dẫn hoặc tóm tắt nội dung CÓ TRONG tài liệu tham khảo
2. KHÔNG ĐƯỢC tự bịa ra bất kỳ hướng dẫn nào không có trong tài liệu
3. KHÔNG ĐƯỢC suy luận hoặc thêm thông tin từ kiến thức bên ngoài
4. Nếu tình huống KHÔNG được đề cập trong tài liệu, trả lời CHÍNH XÁC: "Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý."
5. Nếu tìm thấy hướng dẫn phù hợp, trình bày ngắn gọn theo dạng danh sách các bước

**TRẢ LỜI:**`;

      // Build content array with all relevant documents
      const contentParts = [];

      // Add all document files
      for (const fileData of filesToQuery) {
        contentParts.push({
          fileData: {
            mimeType: fileData.mimeType,
            fileUri: fileData.uri
          }
        });
      }

      // Add the prompt
      contentParts.push({ text: prompt });

      // Query Gemini with documents
      const result = await model.generateContent(contentParts);
      const response = result.response.text();

      // Clean up and format the response
      return this.formatGuidance(response);

    } catch (error) {
      console.error('Error getting Gemini guidance:', error);
      return this.getNoGuidanceMessage();
    }
  }

  // Format the guidance response
  formatGuidance(response) {
    if (!response) {
      return this.getNoGuidanceMessage();
    }

    // Clean up the response
    let formatted = response.trim();

    // Remove any markdown code blocks
    formatted = formatted.replace(/```[\s\S]*?```/g, '');

    // Ensure proper line breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted;
  }

  // Standard message when no guidance is available
  getNoGuidanceMessage() {
    return 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.';
  }

  // Check if a file is already uploaded and still valid
  async checkFileStatus(fileUri) {
    try {
      const file = await this.fileManager.getFile(fileUri);
      return file.state === 'ACTIVE';
    } catch {
      return false;
    }
  }
}

module.exports = new GeminiService();
