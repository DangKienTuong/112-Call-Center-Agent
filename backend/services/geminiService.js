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
      console.warn('Gemini API key not configured. First aid guidance will use fallback responses.');
    }
  }

  // Initialize and upload reference documents
  async initializeDocuments() {
    try {
      const documentsPath = path.join(__dirname, '../../reference_document');

      // Upload Fire/Rescue document
      const pcccPath = path.join(documentsPath, 'Cam-nang-PCCC-trong-gia-dinh.pdf');
      if (fs.existsSync(pcccPath)) {
        try {
          const pcccFile = await this.fileManager.uploadFile(pcccPath, {
            mimeType: 'application/pdf',
            displayName: 'PCCC Guide'
          });
          this.uploadedFiles['FIRE_RESCUE'] = pcccFile.file;
          console.log('Uploaded PCCC document:', pcccFile.file.name);
        } catch (err) {
          console.error('Error uploading PCCC document:', err.message);
        }
      }

      // Upload Medical/First Aid document
      const medicalPath = path.join(documentsPath, 'tai-lieu-so-cap-cuu.pdf');
      if (fs.existsSync(medicalPath)) {
        try {
          const medicalFile = await this.fileManager.uploadFile(medicalPath, {
            mimeType: 'application/pdf',
            displayName: 'First Aid Guide'
          });
          this.uploadedFiles['MEDICAL'] = medicalFile.file;
          console.log('Uploaded Medical document:', medicalFile.file.name);
        } catch (err) {
          console.error('Error uploading Medical document:', err.message);
        }
      }

      this.isInitialized = true;
      console.log('Gemini service initialized with reference documents');
    } catch (error) {
      console.error('Error initializing Gemini documents:', error);
    }
  }

  // Get first aid guidance based on emergency type and description
  async getFirstAidGuidance(emergencyType, description) {
    // If Gemini is not configured, return fallback
    if (!this.genAI) {
      return this.getFallbackGuidance(emergencyType);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      });

      // Determine which document to use
      let fileData = null;
      let documentType = '';

      if (emergencyType === 'FIRE_RESCUE' && this.uploadedFiles['FIRE_RESCUE']) {
        fileData = this.uploadedFiles['FIRE_RESCUE'];
        documentType = 'phòng cháy chữa cháy';
      } else if (emergencyType === 'MEDICAL' && this.uploadedFiles['MEDICAL']) {
        fileData = this.uploadedFiles['MEDICAL'];
        documentType = 'sơ cấp cứu y tế';
      }

      // Build the prompt
      const prompt = `Bạn là chuyên gia tư vấn ${documentType} của tổng đài khẩn cấp 112.

Tình huống người dùng đang gặp phải: "${description || emergencyType}"

Dựa trên tài liệu tham khảo được cung cấp, hãy đưa ra HƯỚNG DẪN XỬ LÝ BAN ĐẦU TẠI CHỖ cho người dùng.

YÊU CẦU:
1. CHỈ đưa ra hướng dẫn NẾU tình huống này được đề cập trong tài liệu tham khảo
2. Nếu tình huống KHÔNG được hướng dẫn trong tài liệu, trả lời: "Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý. Không tự ý thực hiện các biện pháp nếu không chắc chắn."
3. Trả lời ngắn gọn, dễ hiểu, theo dạng danh sách các bước
4. Ưu tiên an toàn của người dùng
5. Không đưa ra lời khuyên y tế chuyên môn ngoài sơ cấp cứu cơ bản

Hướng dẫn xử lý:`;

      let result;

      if (fileData) {
        // Query with the uploaded document
        result = await model.generateContent([
          {
            fileData: {
              mimeType: fileData.mimeType,
              fileUri: fileData.uri
            }
          },
          { text: prompt }
        ]);
      } else {
        // Query without document (for SECURITY or if documents not uploaded)
        result = await model.generateContent(prompt);
      }

      const response = result.response.text();

      // Clean up and format the response
      return this.formatGuidance(response);

    } catch (error) {
      console.error('Error getting Gemini guidance:', error);
      return this.getFallbackGuidance(emergencyType);
    }
  }

  // Format the guidance response
  formatGuidance(response) {
    if (!response) {
      return 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.';
    }

    // Clean up the response
    let formatted = response.trim();

    // Remove any markdown code blocks
    formatted = formatted.replace(/```[\s\S]*?```/g, '');

    // Ensure proper line breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted;
  }

  // Fallback guidance when Gemini is not available
  getFallbackGuidance(emergencyType) {
    const guidance = {
      'FIRE_RESCUE': `🔥 **Hướng dẫn sơ bộ khi có cháy:**
• Di chuyển ra khỏi khu vực nguy hiểm ngay lập tức
• Đóng cửa phòng có đám cháy để hạn chế khói lan
• Di chuyển sát mặt đất nếu có nhiều khói (cúi thấp)
• KHÔNG sử dụng thang máy
• Gọi to để thông báo cho người xung quanh
• Nếu bị kẹt, tìm cửa sổ hoặc ban công để báo hiệu
• Chờ lực lượng PCCC đến hỗ trợ`,

      'MEDICAL': `🏥 **Hướng dẫn sơ cấp cứu cơ bản:**
• Đảm bảo an toàn cho bản thân trước khi tiếp cận nạn nhân
• Kiểm tra ý thức của nạn nhân (gọi, lay nhẹ)
• Nếu nạn nhân bất tỉnh: Kiểm tra đường thở, hô hấp
• Nếu chảy máu: Dùng vải sạch ép chặt vết thương
• Không di chuyển nạn nhân nếu nghi ngờ chấn thương cột sống
• Giữ nạn nhân ấm, trấn an và chờ cấp cứu đến`,

      'SECURITY': `🛡️ **Hướng dẫn khi gặp tình huống an ninh:**
• Đảm bảo an toàn bản thân là ưu tiên hàng đầu
• Di chuyển đến nơi an toàn nếu có thể
• Khóa cửa, tắt đèn nếu đang ở trong nhà
• Ghi nhớ đặc điểm nhận dạng đối tượng (nếu an toàn để quan sát)
• Không đối đầu trực tiếp với đối tượng nguy hiểm
• Chờ lực lượng công an đến xử lý`
    };

    return guidance[emergencyType] || 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý. Đảm bảo an toàn cho bản thân và những người xung quanh.';
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
