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
  console.log('[FirstAidRAG] Description:', state.description);

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
    
    const query = `${state.description || ''} ${typeKeywords}`.trim();
    console.log('[FirstAidRAG] Search query:', query);

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
Mô tả: ${state.description || 'Không có mô tả chi tiết'}

**TÀI LIỆU THAM KHẢO:**
${context}

**QUY TẮC BẮT BUỘC - CỰC KỲ QUAN TRỌNG:**
1. CHỈ ĐƯỢC sử dụng thông tin CÓ TRONG tài liệu tham khảo phía trên
2. TUYỆT ĐỐI KHÔNG ĐƯỢC tự bịa ra hoặc suy luận thông tin không có trong tài liệu
3. TUYỆT ĐỐI KHÔNG ĐƯỢC sử dụng kiến thức của AI ngoài tài liệu được cung cấp
4. Nếu tài liệu KHÔNG đề cập cụ thể đến tình huống này, trả lời CHÍNH XÁC:
   "Vui lòng giữ bình tĩnh và chờ lực lượng chức năng đến xử lý."
5. Nếu tìm thấy hướng dẫn phù hợp trong tài liệu:
   - Trình bày ngắn gọn theo dạng danh sách các bước (1, 2, 3...)
   - CHỈ nêu những bước CÓ TRONG tài liệu
   - Kết thúc bằng "[Nguồn: tên tài liệu]"
6. Đây là thông tin y tế/cứu nạn - sai sót có thể gây nguy hiểm tính mạng

**YÊU CẦU ĐỊNH DẠNG:**
- Sử dụng danh sách đánh số (1., 2., 3...)
- Ngắn gọn, rõ ràng, dễ thực hiện
- Không quá 7 bước
- Kết thúc bằng nguồn tài liệu

Hãy cung cấp hướng dẫn xử lý ban đầu:`;

    const response = await model.invoke(prompt);
    const guidance = response.content.trim();

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

