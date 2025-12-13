const { ChatOpenAI } = require('@langchain/openai');
const retriever = require('../retriever');

/**
 * First Aid RAG Node
 * Uses document retrieval to provide evidence-based first aid guidance
 * Replaces the OpenAI Assistants API approach
 */

async function firstAidRagNode(state) {
  console.log('[FirstAidRAG] Generating first aid guidance');
  console.log('[FirstAidRAG] Emergency types:', state.emergencyTypes);

  // Wait for retriever initialization
  await retriever.initialize();

  // Check if retriever is available
  const status = retriever.getStatus();
  if (!status.hasVectorStore) {
    console.log('[FirstAidRAG] Vector store not available, returning default message');
    return {
      firstAidGuidance: 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.',
    };
  }

  // For SECURITY-only cases, we don't have specific guidance
  if (state.emergencyTypes.length === 1 && state.emergencyTypes.includes('SECURITY')) {
    console.log('[FirstAidRAG] Security-only case, no medical guidance needed');
    return {
      firstAidGuidance: 'Vui lòng giữ bình tĩnh và chờ lực lượng công an đến xử lý.',
    };
  }

  try {
    // Build search query from description and emergency types
    const emergencyTypeMap = {
      'FIRE_RESCUE': 'cháy nổ cứu hỏa mắc kẹt',
      'MEDICAL': 'cấp cứu y tế sơ cứu tai nạn',
      'SECURITY': 'an ninh',
    };
    
    const typeKeywords = state.emergencyTypes
      .map(t => emergencyTypeMap[t] || '')
      .join(' ');
    
    // Build context from ALL user messages (short-term memory)
    // This captures the full situation description from the conversation
    // Filter out short confirmation words like "đúng", "xác nhận", etc.
    const userMessages = (state.messages || [])
      .filter(m => m.role === 'reporter')
      .map(m => m.message)
      .filter(msg => msg && msg.length > 10) // Filter out short confirmations
      .join(' ');
    
    // ALWAYS use userMessages as primary context (short-term memory)
    // This ensures we capture the actual emergency description from conversation
    const situationDescription = userMessages || state.description || '';
    
    const query = `${situationDescription} ${typeKeywords}`.trim();
    console.log('[FirstAidRAG] Search query:', query.substring(0, 100) + '...');

    // Retrieve relevant documents
    const relevantDocs = await retriever.retrieve(query, state.emergencyTypes, 3);

    if (relevantDocs.length === 0) {
      console.log('[FirstAidRAG] No relevant documents found');
      return {
        firstAidGuidance: 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.',
      };
    }

    console.log(`[FirstAidRAG] Found ${relevantDocs.length} relevant documents`);

    // Build context from retrieved documents
    const context = relevantDocs
      .map((doc, i) => `[Tài liệu ${i + 1} - ${doc.metadata.source}]:\n${doc.pageContent}`)
      .join('\n\n');

    // Generate guidance using LLM with retrieved context
    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.1, // Low temperature for consistent, factual responses
    });

    const prompt = `Bạn là tổng đài viên 112 đang cung cấp hướng dẫn xử lý ban đầu cho tình huống khẩn cấp.

**TÌNH HUỐNG:**
Loại: ${state.emergencyTypes.join(', ')}
Mô tả: ${situationDescription || 'Không có mô tả chi tiết'}

**TÀI LIỆU THAM KHẢO:**
${context}

**QUY TẮC BẮT BUỘC - CỰC KỲ QUAN TRỌNG:**
1. CHỈ ĐƯỢC sử dụng thông tin CÓ TRONG tài liệu tham khảo phía trên
2. TUYỆT ĐỐI KHÔNG ĐƯỢC tự bịa ra hoặc suy luận thông tin không có trong tài liệu
3. TUYỆT ĐỐI KHÔNG ĐƯỢC sử dụng kiến thức của AI ngoài tài liệu được cung cấp
4. TUYỆT ĐỐI KHÔNG được ghi:
   - Nguồn trích dẫn (không ghi "[Nguồn: ...]" hay tên tài liệu)
   - Lời khuyên gọi cấp cứu/cứu hỏa/công an (113, 114, 115) vì người dùng đã đang liên hệ qua hệ thống này
   - Lời khuyên di chuyển đến cơ sở y tế gần nhất vì lực lượng chức năng sẽ đến hỗ trợ
5. Nếu tài liệu KHÔNG đề cập cụ thể đến tình huống này, trả lời CHÍNH XÁC:
   "Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý."
6. Nếu tìm thấy hướng dẫn phù hợp trong tài liệu:
   - Trình bày ngắn gọn theo dạng danh sách các bước (1., 2., 3...)
   - CHỈ nêu những bước CÓ TRONG tài liệu
   - Tối đa 5 bước quan trọng nhất
7. Đây là thông tin y tế/cứu nạn - sai sót có thể gây nguy hiểm tính mạng

**YÊU CẦU ĐỊNH DẠNG:**
- Sử dụng danh sách đánh số (1., 2., 3...)
- Ngắn gọn, rõ ràng, dễ thực hiện
- Không quá 5 bước
- KHÔNG ghi nguồn tài liệu

Hãy cung cấp hướng dẫn xử lý ban đầu:`;

    const response = await model.invoke(prompt);
    let guidance = response.content.trim();

    // Filter out any accidental source citations and unnecessary advice
    guidance = guidance
      .replace(/\[Nguồn:.*?\]/gi, '')
      .replace(/Nguồn:.*$/gm, '')
      .replace(/\[Tài liệu.*?\]/gi, '')
      .replace(/Gọi.*?(113|114|115|cấp cứu|cứu hỏa|công an).*?\./gi, '')
      .replace(/Di chuyển.*?cơ sở y tế.*?\./gi, '')
      .replace(/Đến.*?(bệnh viện|phòng khám|cơ sở y tế).*?\./gi, '')
      .replace(/Liên hệ.*?(bác sĩ|y tế|cấp cứu).*?\./gi, '')
      .trim();

    console.log('[FirstAidRAG] Generated guidance, length:', guidance.length);

    return {
      firstAidGuidance: guidance,
    };

  } catch (error) {
    console.error('[FirstAidRAG] Error generating guidance:', error);
    return {
      firstAidGuidance: 'Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý.',
    };
  }
}

module.exports = {
  firstAidRagNode,
};
