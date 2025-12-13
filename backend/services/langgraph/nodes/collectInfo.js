const { hasCompleteLocation } = require('../state');
const { ChatOpenAI } = require('@langchain/openai');
const retriever = require('../retriever');

/**
 * Collection Nodes
 * These nodes ask for specific information if it's missing
 * Each node generates a Vietnamese prompt asking for the missing info
 */

/**
 * Collect Location Node
 * Asks for complete address if missing
 */
async function collectLocationNode(state) {
  console.log('[CollectLocation] Current location:', state.location);

  let prompt = '';

  // Check what parts of location are missing
  if (!state.location.address) {
    prompt = 'Bạn cho tôi địa chỉ cụ thể (số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố)?';
  } else if (!state.location.ward && !state.location.city) {
    // Have address but missing ward and city
    prompt = `Địa chỉ "${state.location.address}" thuộc phường/xã nào, tỉnh/thành phố nào?`;
  } else if (!state.location.ward) {
    prompt = `Địa chỉ thuộc phường hoặc xã nào của ${state.location.city}?`;
  } else if (!state.location.city) {
    prompt = 'Tỉnh hoặc thành phố nào?';
  } else {
    // Should not reach here, but handle gracefully
    prompt = 'Vui lòng xác nhận lại địa chỉ đầy đủ.';
  }

  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Collect Emergency Type Node
 * Asks about the current situation/emergency - this is now the first question
 */
async function collectEmergencyNode(state) {
  console.log('[CollectEmergency] Current emergencyTypes:', state.emergencyTypes);

  const prompt = 'Xin chào, đây là tổng đài 112. Bạn đang gặp tình huống gì? Hãy mô tả chi tiết chuyện gì đang xảy ra.';

  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Collect Phone Node
 * Asks for contact phone number
 */
async function collectPhoneNode(state) {
  console.log('[CollectPhone] Current phone:', state.phone);
  
  const prompt = 'Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.';
  
  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Collect Affected People Node
 * Asks about number of people affected
 */
async function collectPeopleNode(state) {
  console.log('[CollectPeople] Current affectedPeople:', state.affectedPeople);
  
  let prompt = 'Có bao nhiêu người cần trợ giúp?';
  
  // If we know it's a medical or fire emergency, be more specific
  if (state.emergencyTypes.includes('MEDICAL')) {
    prompt = 'Có bao nhiêu người bị thương? Có ai nguy kịch không?';
  } else if (state.emergencyTypes.includes('FIRE_RESCUE')) {
    prompt = 'Có bao nhiêu người bị ảnh hưởng? Có ai bị mắc kẹt không?';
  }
  
  return {
    response: prompt,
    messages: [{
      role: 'operator',
      message: prompt,
      timestamp: new Date(),
    }],
  };
}

/**
 * Show First Aid Guidance Node
 * Provides initial handling guidance based on the emergency type
 * Called after collecting emergency type, before asking for other info
 */
async function showFirstAidGuidanceNode(state) {
  console.log('[ShowFirstAidGuidance] Generating guidance for:', state.emergencyTypes);

  // Wait for retriever initialization
  await retriever.initialize();

  const status = retriever.getStatus();
  let guidance = '';

  // For SECURITY-only cases, provide simple guidance
  if (state.emergencyTypes.length === 1 && state.emergencyTypes.includes('SECURITY')) {
    console.log('[ShowFirstAidGuidance] Security-only case');
    guidance = 'Hãy giữ bình tĩnh, di chuyển đến nơi an toàn nếu có thể, và tránh đối đầu trực tiếp.';
  } else if (status.hasVectorStore) {
    try {
      // Get user messages for context
      const userMessages = (state.messages || [])
        .filter(m => m.role === 'reporter')
        .map(m => m.message)
        .filter(msg => msg && msg.length > 5)
        .join(' ');

      const situationDescription = userMessages || state.description || '';
      
      // Extract key emergency terms from user message for more focused search
      // This helps find specific first aid instructions instead of generic ones
      const emergencyKeywords = [
        // MEDICAL
        'đột quỵ', 'tai biến', 'ngất', 'bất tỉnh', 'co giật', 'đau tim', 'nhồi máu',
        'chảy máu', 'vết thương', 'gãy xương', 'trật khớp', 'bỏng', 'phỏng',
        'ngộ độc', 'dị ứng', 'sốc phản vệ', 'đuối nước', 'điện giật',
        'rắn cắn', 'chó cắn', 'ong đốt', 'ong chích',
        'ngưng tim', 'ngưng thở', 'hồi sinh tim phổi', 'cpr',
        'tai nạn giao thông', 'tai nạn',
        // FIRE_RESCUE  
        'cháy', 'hỏa hoạn', 'mắc kẹt', 'sập', 'nổ',
      ];
      
      // Find matching keywords in user message
      const lowerMessage = situationDescription.toLowerCase();
      const foundKeywords = emergencyKeywords.filter(kw => lowerMessage.includes(kw));
      
      let query;
      if (foundKeywords.length > 0) {
        // Use specific keywords for focused search
        query = `xử trí ${foundKeywords.join(' ')}`;
      } else if (situationDescription.length > 10) {
        // Fallback to situation description but keep it short
        const shortDesc = situationDescription.split(' ').slice(0, 10).join(' ');
        query = `cách xử trí ${shortDesc}`;
      } else {
        // Fallback to type-based keywords
        const emergencyTypeMap = {
          'FIRE_RESCUE': 'xử trí cháy nổ cứu hộ',
          'MEDICAL': 'sơ cứu cấp cứu y tế',
          'SECURITY': 'xử lý an ninh',
        };
        query = state.emergencyTypes
          .map(t => emergencyTypeMap[t] || '')
          .filter(k => k)
          .join(' ');
      }

      console.log('[ShowFirstAidGuidance] Search query:', query.substring(0, 100));
      console.log('[ShowFirstAidGuidance] Found keywords:', foundKeywords);

      // For first aid guidance, search in both MEDICAL and the detected emergency types
      // because many emergencies (drowning, fire burns, etc.) require medical first aid
      const searchTypes = [...new Set([...state.emergencyTypes, 'MEDICAL'])];
      console.log('[ShowFirstAidGuidance] Searching in types:', searchTypes);

      // Retrieve relevant documents
      const relevantDocs = await retriever.retrieve(query, searchTypes, 3);

      if (relevantDocs.length > 0) {
        console.log(`[ShowFirstAidGuidance] Found ${relevantDocs.length} relevant documents`);

        // Build context from retrieved documents
        const context = relevantDocs
          .map((doc, i) => `[Tài liệu ${i + 1}]:\n${doc.pageContent}`)
          .join('\n\n');

        // Generate guidance using LLM
        const model = new ChatOpenAI({
          modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          temperature: 0.1,
        });

        const prompt = `Bạn là tổng đài viên 112 đang cung cấp hướng dẫn xử lý ban đầu cho tình huống khẩn cấp.

**TÌNH HUỐNG:**
Loại: ${state.emergencyTypes.join(', ')}
Mô tả: ${situationDescription || 'Không có mô tả chi tiết'}

**TÀI LIỆU THAM KHẢO:**
${context}

**QUY TẮC:**
1. Dựa vào tài liệu tham khảo, trích xuất các bước xử lý phù hợp nhất với tình huống
2. KHÔNG ĐƯỢC ghi:
   - Nguồn trích dẫn (không ghi "[Nguồn: ...]" hay tên tài liệu)
   - Lời khuyên gọi cấp cứu/cứu hỏa/công an (113, 114, 115) vì người dùng đã đang liên hệ qua hệ thống này
   - Lời khuyên di chuyển đến cơ sở y tế gần nhất vì lực lượng chức năng sẽ đến hỗ trợ
3. Trình bày ngắn gọn theo dạng danh sách các bước (1., 2., 3...)
4. Tối đa 5 bước quan trọng nhất
5. Nếu tài liệu không có thông tin liên quan, trả về chuỗi rỗng ""

Hãy cung cấp hướng dẫn xử lý ban đầu:`;

        const response = await model.invoke(prompt);
        guidance = response.content.trim();

        // Filter out any accidental source citations
        guidance = guidance
          .replace(/\[Nguồn:.*?\]/gi, '')
          .replace(/Nguồn:.*$/gm, '')
          .replace(/\[Tài liệu.*?\]/gi, '')
          .replace(/Gọi.*?(113|114|115|cấp cứu|cứu hỏa|công an).*?\./gi, '')
          .replace(/Di chuyển.*?cơ sở y tế.*?\./gi, '')
          .replace(/Đến.*?(bệnh viện|phòng khám|cơ sở y tế).*?\./gi, '')
          .trim();

        console.log('[ShowFirstAidGuidance] Generated guidance, length:', guidance.length);
      }
    } catch (error) {
      console.error('[ShowFirstAidGuidance] Error generating guidance:', error);
    }
  }

  // Build response message
  let responseMessage = '';

  if (guidance && guidance.length > 10) {
    responseMessage = `💡 **HƯỚNG DẪN XỬ LÝ BAN ĐẦU:**
${guidance}

---

`;
  }

  // After showing guidance, ask for location
  if (!hasCompleteLocation(state.location)) {
    responseMessage += 'Bạn cho tôi địa chỉ cụ thể (số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố)?';
  } else if (!state.phone || state.phone.length < 9) {
    responseMessage += 'Cho tôi số điện thoại để lực lượng cứu hộ liên hệ.';
  }

  return {
    response: responseMessage || 'Vui lòng cho tôi biết địa chỉ cụ thể.',
    firstAidShown: true,
    messages: [{
      role: 'operator',
      message: responseMessage,
      timestamp: new Date(),
    }],
  };
}

module.exports = {
  collectLocationNode,
  collectEmergencyNode,
  collectPhoneNode,
  collectPeopleNode,
  showFirstAidGuidanceNode,
};

