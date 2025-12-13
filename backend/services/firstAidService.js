const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class FirstAidService {
  constructor() {
    this.openai = null;
    this.assistant = null;
    this.uploadedFiles = {};
    this.isInitialized = false;
    this.initPromise = null;

    // DEPRECATED: This service is replaced by LangGraph RAG (services/langgraph/retriever.js)
    // Keeping for backwards compatibility but NOT auto-initializing
    console.log('[FirstAidService] DEPRECATED - Use LangGraph RAG instead');
    
    // Disabled auto-initialization - now using LangGraph RAG
    // if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
    //   this.openai = new OpenAI({
    //     apiKey: process.env.OPENAI_API_KEY,
    //   });
    //   this.initPromise = this.initializeDocuments();
    // }
  }

  // Initialize and upload reference documents
  async initializeDocuments() {
    try {
      const documentsPath = path.join(__dirname, '../../reference_document');
      console.log('Looking for reference documents in:', documentsPath);

      const fileIds = [];

      // Upload Fire/Rescue document - Cẩm nang PCCC
      const pcccPath = path.join(documentsPath, 'Cam-nang-PCCC-trong-gia-dinh.pdf');
      console.log('Checking PCCC document at:', pcccPath);

      if (fs.existsSync(pcccPath)) {
        try {
          console.log('Uploading PCCC document...');
          const pcccFile = await this.openai.files.create({
            file: fs.createReadStream(pcccPath),
            purpose: 'assistants'
          });
          this.uploadedFiles['FIRE_RESCUE'] = pcccFile;
          fileIds.push(pcccFile.id);
          console.log('✓ Uploaded PCCC document:', pcccFile.id);
        } catch (err) {
          console.error('✗ Error uploading PCCC document:', err.message);
        }
      } else {
        console.warn('✗ PCCC document not found at:', pcccPath);
      }

      // Upload Medical/First Aid document - Tài liệu sơ cấp cứu
      const medicalPath = path.join(documentsPath, 'tai-lieu-so-cap-cuu.pdf');
      console.log('Checking Medical document at:', medicalPath);

      if (fs.existsSync(medicalPath)) {
        try {
          console.log('Uploading Medical document...');
          const medicalFile = await this.openai.files.create({
            file: fs.createReadStream(medicalPath),
            purpose: 'assistants'
          });
          this.uploadedFiles['MEDICAL'] = medicalFile;
          fileIds.push(medicalFile.id);
          console.log('✓ Uploaded Medical document:', medicalFile.id);
        } catch (err) {
          console.error('✗ Error uploading Medical document:', err.message);
        }
      } else {
        console.warn('✗ Medical document not found at:', medicalPath);
      }

      // Create assistant with file search capability
      if (fileIds.length > 0) {
        console.log('Creating OpenAI assistant with file search...');
        this.assistant = await this.openai.beta.assistants.create({
          name: "112 First Aid Guide Assistant",
          instructions: "Bạn là tổng đài viên 112 chuyên cung cấp hướng dẫn sơ cấp cứu và PCCC. CHỈ trả lời dựa trên tài liệu được cung cấp. KHÔNG bịa ra thông tin.",
          model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
          tools: [{ type: "file_search" }],
        });

        // Create a vector store and attach files
        const vectorStore = await this.openai.beta.vectorStores.create({
          name: "Emergency Reference Documents",
          file_ids: fileIds
        });

        // Update assistant with vector store
        await this.openai.beta.assistants.update(this.assistant.id, {
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStore.id]
            }
          }
        });

        console.log('✓ Assistant created:', this.assistant.id);
      }

      this.isInitialized = true;
      console.log('First aid service initialized. Available documents:', Object.keys(this.uploadedFiles));
    } catch (error) {
      console.error('Error initializing first aid documents:', error);
    }
  }

  // Wait for initialization to complete
  async waitForInit() {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  // Get first aid guidance based on emergency types and description
  // emergencyTypes can be a string or array of types
  // DEPRECATED: This method is replaced by LangGraph RAG (firstAidRagNode)
  async getFirstAidGuidance(emergencyTypes, description) {
    // DEPRECATED - return default message
    // The new LangGraph RAG system handles first aid guidance via firstAidRagNode
    console.log('[FirstAidService] DEPRECATED - getFirstAidGuidance called, returning default');
    return this.getNoGuidanceMessage();
    
    /* OLD CODE - DISABLED
    // Wait for documents to be uploaded
    await this.waitForInit();

    // Normalize emergencyTypes to array
    const types = Array.isArray(emergencyTypes) ? emergencyTypes : [emergencyTypes];
    console.log('Getting guidance for types:', types, 'Description:', description);

    // If OpenAI is not configured, return no guidance message
    if (!this.openai || !this.assistant) {
      console.log('OpenAI not configured or assistant not initialized');
      return this.getNoGuidanceMessage();
    }
    */

    try {
      // Check which document types are relevant
      const documentNames = [];
      let hasRelevantDocuments = false;

      if (types.includes('FIRE_RESCUE') && this.uploadedFiles['FIRE_RESCUE']) {
        documentNames.push('Cẩm nang PCCC trong gia đình');
        hasRelevantDocuments = true;
        console.log('Will query FIRE_RESCUE document');
      }

      if (types.includes('MEDICAL') && this.uploadedFiles['MEDICAL']) {
        documentNames.push('Tài liệu sơ cấp cứu');
        hasRelevantDocuments = true;
        console.log('Will query MEDICAL document');
      }

      // For SECURITY type, we don't have a reference document
      // Only provide guidance if there's also MEDICAL or FIRE_RESCUE involved
      if (types.includes('SECURITY') && !hasRelevantDocuments) {
        console.log('SECURITY type only, no documents to query');
        return this.getNoGuidanceMessage();
      }

      // If no documents available, return no guidance
      if (!hasRelevantDocuments) {
        console.log('No documents available to query');
        return this.getNoGuidanceMessage();
      }

      // Build the strict prompt - CHỈ tham khảo từ tài liệu, KHÔNG sử dụng kiến thức riêng
      const prompt = `Bạn là tổng đài viên 112. Người dùng đang gặp tình huống khẩn cấp.

**MÔ TẢ TÌNH HUỐNG CỦA NGƯỜI DÙNG:**
"${description || 'Không có mô tả chi tiết'}"

**LOẠI TÌNH HUỐNG:** ${types.join(', ')}

**NHIỆM VỤ CỦA BẠN:**
Tìm trong tài liệu tham khảo (${documentNames.join(', ')}) xem có hướng dẫn xử lý ban đầu phù hợp với tình huống này không.

**QUY TẮC BẮT BUỘC - RẤT QUAN TRỌNG:**
1. CHỈ ĐƯỢC trích dẫn hoặc tóm tắt nội dung CÓ TRONG tài liệu tham khảo được đính kèm
2. TUYỆT ĐỐI KHÔNG ĐƯỢC tự bịa ra bất kỳ hướng dẫn nào không có trong tài liệu
3. TUYỆT ĐỐI KHÔNG ĐƯỢC suy luận hoặc thêm thông tin từ kiến thức của AI
4. Nếu tình huống KHÔNG được đề cập cụ thể trong tài liệu, trả lời CHÍNH XÁC: "Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý."
5. Nếu tìm thấy hướng dẫn phù hợp:
   - Trình bày ngắn gọn theo dạng danh sách các bước
   - Ghi rõ nguồn: "[Theo tài liệu: tên tài liệu]"
   - Chỉ nêu những bước CÓ TRONG tài liệu, không thêm bớt
6. Đây là thông tin y tế/cứu nạn quan trọng - KHÔNG ĐƯỢC phép tự ý thêm hướng dẫn ngoài tài liệu vì có thể gây nguy hiểm

**ĐỊNH DẠNG TRẢ LỜI:**
- Sử dụng danh sách đánh số (1, 2, 3...)
- Ngắn gọn, rõ ràng, dễ thực hiện
- Kết thúc bằng "[Nguồn: tên tài liệu tham khảo]"

**TRẢ LỜI:**`;

      console.log('Querying OpenAI assistant with', documentNames.length, 'document types...');

      // Create a thread
      const thread = await this.openai.beta.threads.create();

      // Add the message to the thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: prompt
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistant.id
      });

      // Wait for the run to complete
      let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      // Poll until the run is complete
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        if (runStatus.status === 'failed') {
          console.error('OpenAI run failed:', runStatus.last_error);
          return this.getNoGuidanceMessage();
        }
      }

      // Get the assistant's response
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (!assistantMessage || !assistantMessage.content[0]) {
        console.log('No response from assistant');
        return this.getNoGuidanceMessage();
      }

      const response = assistantMessage.content[0].text.value;
      console.log('OpenAI response received, length:', response?.length);

      // Clean up and format the response
      return this.formatGuidance(response);

    } catch (error) {
      console.error('Error getting OpenAI guidance:', error);
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
  async checkFileStatus(fileId) {
    try {
      const file = await this.openai.files.retrieve(fileId);
      return file.status === 'processed';
    } catch {
      return false;
    }
  }
}

module.exports = new FirstAidService();
