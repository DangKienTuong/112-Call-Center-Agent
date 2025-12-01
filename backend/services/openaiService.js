const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class OpenAIService {
  constructor() {
    // Only initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      console.warn('OpenAI API key not configured. Service will use fallback responses.');
      this.openai = null;
    }

    this.systemPrompt = null;
    this.conversationHistory = new Map(); // Store conversation history per session
    this.collectedInfo = new Map(); // Store collected ticket info per session
    this.initializePrompt();
  }

  // Load system prompt from file
  async initializePrompt() {
    try {
      const promptPath = path.join(__dirname, '../../prompt.txt');
      this.systemPrompt = await fs.readFile(promptPath, 'utf-8');
      console.log('System prompt loaded successfully');
    } catch (error) {
      console.error('Error loading system prompt:', error);
      this.systemPrompt = this.getDefaultPrompt();
    }
  }

  // Default prompt as fallback
  getDefaultPrompt() {
    return `Bạn là tổng đài viên AI của đường dây nóng khẩn cấp 112 Việt Nam.
    Thu thập NHANH 4 thông tin bắt buộc:
    1. Địa chỉ đầy đủ (số nhà, đường, phường/xã, tỉnh/thành phố)
    2. Loại tình huống (FIRE_RESCUE/MEDICAL/SECURITY)
    3. Số điện thoại liên hệ
    4. Số người bị ảnh hưởng

    KHÔNG yêu cầu quận/huyện.
    Hỏi từng thông tin một. Khi đủ thông tin, tạo JSON.
    LUÔN trả lời bằng TIẾNG VIỆT.`;
  }

  // Get or initialize session info
  getSessionInfo(sessionId) {
    if (!this.collectedInfo.has(sessionId)) {
      this.collectedInfo.set(sessionId, {
        location: null,
        locationDetails: {
          address: null,
          ward: null,
          district: null,
          city: null,
          landmarks: null
        },
        emergencyTypes: [], // Mảng các loại khẩn cấp (có thể nhiều loại)
        emergencyType: null, // Loại chính (ưu tiên cao nhất)
        description: null,
        reporter: {
          name: null,
          phone: null
        },
        affectedPeople: {
          total: 0,
          injured: 0,
          critical: 0
        },
        supportRequired: {
          police: false,
          ambulance: false,
          fireDepartment: false,
          rescue: false
        },
        priority: 'HIGH',
        confirmationShown: false, // Flag đánh dấu đã hiển thị xác nhận cho người dùng chưa
        userConfirmed: false // Flag đánh dấu người dùng đã xác nhận thông tin chưa
      });
    }
    return this.collectedInfo.get(sessionId);
  }

  // Process a message using OpenAI
  async processMessage(message, sessionId, context = []) {
    try {
      // Get accumulated info for this session
      const sessionInfo = this.getSessionInfo(sessionId);

      // Extract info from current message FIRST
      this.extractInfoFromMessage(message, sessionInfo);

      // Also extract from context if available
      if (context && context.length > 0) {
        context.forEach(msg => {
          if (msg.role === 'reporter') {
            this.extractInfoFromMessage(msg.message, sessionInfo);
          }
        });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.log('OpenAI API key not configured, using fallback response');
        return await this.fallbackResponse(message, sessionInfo, sessionId);
      }

      // Get or create conversation history for this session
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, []);
      }

      // Build messages array for OpenAI
      const messages = [
        { role: 'system', content: this.systemPrompt || this.getDefaultPrompt() }
      ];

      // Add context from previous messages
      if (context && context.length > 0) {
        context.forEach(msg => {
          messages.push({
            role: msg.role === 'reporter' ? 'user' : 'assistant',
            content: msg.message
          });
        });
      }

      // Add info about what we've already collected
      const collectedSummary = this.getCollectedSummary(sessionInfo);
      if (collectedSummary) {
        messages.push({
          role: 'system',
          content: `Thông tin đã thu thập: ${collectedSummary}. Chỉ hỏi những thông tin còn thiếu.`
        });
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.3,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0].message.content;

      // Try to extract JSON from AI response
      const jsonData = this.extractJsonFromResponse(aiResponse);
      if (jsonData) {
        // Merge AI-provided JSON with our extracted data
        this.mergeJsonData(sessionInfo, jsonData);
      }

      // Kiểm tra xem đã đủ thông tin cơ bản chưa
      const hasAllInfo = this.hasAllRequiredInfo(sessionInfo);
      let finalResponse = aiResponse;
      
      // Nếu đủ thông tin và chưa hiển thị xác nhận -> hiển thị xác nhận cho người dùng
      if (hasAllInfo && !sessionInfo.confirmationShown) {
        sessionInfo.confirmationShown = true;
        
        // Xây dựng danh sách lực lượng cần điều động
        const forces = [];
        if (sessionInfo.supportRequired.police) forces.push('Công an');
        if (sessionInfo.supportRequired.fireDepartment) forces.push('Cứu hỏa');
        if (sessionInfo.supportRequired.ambulance) forces.push('Cấp cứu');
        if (sessionInfo.supportRequired.rescue && !sessionInfo.supportRequired.fireDepartment) forces.push('Cứu hộ');
        const forcesStr = forces.length > 0 ? forces.join(', ') : 'Lực lượng cứu hộ';
        
        // Map loại tình huống sang tiếng Việt
        const emergencyTypeMap = {
          'FIRE_RESCUE': 'PCCC & Cứu nạn cứu hộ',
          'MEDICAL': 'Cấp cứu y tế',
          'SECURITY': 'An ninh'
        };
        const emergencyTypes = sessionInfo.emergencyTypes || [sessionInfo.emergencyType];
        const emergencyTypesVi = emergencyTypes.map(t => emergencyTypeMap[t] || t).join(', ');
        
        // Hiển thị xác nhận thông tin
        finalResponse = `📋 **XÁC NHẬN THÔNG TIN PHIẾU KHẨN CẤP:**

• **Địa điểm:** ${sessionInfo.location}
• **Loại tình huống:** ${emergencyTypesVi}
• **Số điện thoại:** ${sessionInfo.reporter.phone}
• **Số người bị ảnh hưởng:** ${sessionInfo.affectedPeople.total} người

🚨 **Lực lượng sẽ điều động:** ${forcesStr}

⚠️ **Vui lòng xác nhận thông tin trên đã chính xác?** (Trả lời "Đúng" hoặc "Xác nhận" để tạo phiếu khẩn cấp)`;
      }
      
      // Kiểm tra xem người dùng đã xác nhận chưa
      if (sessionInfo.confirmationShown && !sessionInfo.userConfirmed) {
        const confirmKeywords = ['đúng', 'xác nhận', 'ok', 'yes', 'đúng rồi', 'chính xác', 'đồng ý', 'oke', 'ừ', 'uh', 'vâng'];
        const lowerMessage = message.toLowerCase().trim();
        
        if (confirmKeywords.some(keyword => lowerMessage.includes(keyword))) {
          sessionInfo.userConfirmed = true;
          console.log('User confirmed ticket info for session:', sessionId);
        }
      }

      // Check if ticket is ready (cần đủ thông tin VÀ người dùng đã xác nhận)
      const isReady = this.isTicketReady(sessionInfo);

      // Build final ticket info for response
      const ticketInfo = this.buildTicketInfo(sessionInfo);

      return {
        response: finalResponse,
        ticketInfo: ticketInfo,
        shouldCreateTicket: isReady
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      const sessionInfo = this.getSessionInfo(sessionId);
      return await this.fallbackResponse(message, sessionInfo, sessionId);
    }
  }

  // Kiểm tra xem đã đủ 4 thông tin bắt buộc chưa
  // (Cần: địa chỉ, loại tình huống, SĐT, số người bị ảnh hưởng)
  hasAllRequiredInfo(info) {
    const hasValidLocation = info.location && (
      info.location.toLowerCase().includes('phường') ||
      info.location.toLowerCase().includes('xã') ||
      info.location.toLowerCase().includes('thành phố') ||
      info.location.toLowerCase().includes('tp.') ||
      info.location.toLowerCase().includes('tỉnh') ||
      info.location.toLowerCase().includes('ward') ||
      info.location.includes(',')
    );

    const hasEmergencyType = (info.emergencyTypes && info.emergencyTypes.length > 0) ||
      (info.emergencyType && ['FIRE_RESCUE', 'MEDICAL', 'SECURITY'].includes(info.emergencyType));

    const hasPhone = info.reporter.phone && info.reporter.phone.length >= 9;
    
    const hasAffectedPeople = info.affectedPeople.total > 0;

    return !!(hasValidLocation && hasEmergencyType && hasPhone && hasAffectedPeople);
  }

  // Extract information from a single message
  extractInfoFromMessage(message, info) {
    if (!message) return;

    const lowerMessage = message.toLowerCase();

    // Extract phone number (Vietnamese format)
    const phonePatterns = [
      /(?:0|\+84)(?:\d{9,10})/g,
      /\b\d{4}[-.\s]?\d{3}[-.\s]?\d{3}\b/g,
      /\b\d{3}[-.\s]?\d{4}[-.\s]?\d{3}\b/g
    ];

    for (const pattern of phonePatterns) {
      const match = message.match(pattern);
      if (match) {
        info.reporter.phone = match[0].replace(/[-.\s]/g, '');
        break;
      }
    }

    // Extract name
    const namePatterns = [
      /(?:tên(?:\s+là)?|tôi là|mình là|tên tôi là)\s*:?\s*([A-Za-zÀ-ỹ\s]{2,30})/i,
      /(?:name(?:\s+is)?|i am|i'm)\s*:?\s*([A-Za-zÀ-ỹ\s]{2,30})/i
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && !info.reporter.name) {
        info.reporter.name = match[1].trim();
        break;
      }
    }

    // Extract location - Vietnamese addresses
    const addressPatterns = [
      // Full address with number
      /(\d+[A-Za-z]?\s*(?:\/\d+)?)\s*(đường|phố|ngõ|hẻm|ngách)?\s*([A-Za-zÀ-ỹ\s\d]+?)(?:,|$)/i,
      // Street names
      /(đường|phố)\s+([A-Za-zÀ-ỹ\s\d]+?)(?:,|\s+(?:phường|quận|huyện|thành phố|tp\.))/i
    ];

    for (const pattern of addressPatterns) {
      const match = message.match(pattern);
      if (match && !info.locationDetails.address) {
        info.locationDetails.address = match[0].replace(/,\s*$/, '').trim();
        break;
      }
    }

    // Extract district (Quận/Huyện)
    const districtMatch = message.match(/(?:quận|huyện|q\.?)\s*(\d+|[A-Za-zÀ-ỹ\s]+?)(?:,|$|\s+(?:thành phố|tp\.|tỉnh))/i);
    if (districtMatch) {
      info.locationDetails.district = districtMatch[0].replace(/,\s*$/, '').trim();
    }

    // Extract ward (Phường/Xã)
    const wardMatch = message.match(/(?:phường|xã|p\.?)\s*(\d+|[A-Za-zÀ-ỹ\s]+?)(?:,|$|\s+(?:quận|huyện))/i);
    if (wardMatch) {
      info.locationDetails.ward = wardMatch[0].replace(/,\s*$/, '').trim();
    }

    // Extract city
    const cityPatterns = [
      /(?:thành phố|tp\.?|tỉnh)\s*([A-Za-zÀ-ỹ\s]+?)(?:,|$)/i,
      /(hà nội|hồ chí minh|đà nẵng|hải phòng|cần thơ)/i
    ];

    for (const pattern of cityPatterns) {
      const match = message.match(pattern);
      if (match) {
        info.locationDetails.city = match[1] ? match[1].trim() : match[0].trim();
        break;
      }
    }

    // Build full location string
    const locationParts = [
      info.locationDetails.address,
      info.locationDetails.ward,
      info.locationDetails.district,
      info.locationDetails.city
    ].filter(Boolean);

    if (locationParts.length > 0) {
      info.location = locationParts.join(', ');
    }

    // Extract emergency types from keywords - CÓ THỂ NHIỀU LOẠI
    const detectedTypes = new Set(info.emergencyTypes || []);

    // SECURITY - An ninh trật tự (ưu tiên nhận diện trước)
    if (/trộm|cướp|đột nhập|ăn trộm|kẻ trộm|ăn cắp/i.test(lowerMessage)) {
      detectedTypes.add('SECURITY');
      info.supportRequired.police = true;
    }
    if (/đánh nhau|hành hung|đánh người|bạo lực|côn đồ|xô xát/i.test(lowerMessage)) {
      detectedTypes.add('SECURITY');
      info.supportRequired.police = true;
    }
    if (/đua xe|quậy phá|gây rối|say rượu|phá hoại/i.test(lowerMessage)) {
      detectedTypes.add('SECURITY');
      info.supportRequired.police = true;
    }
    if (/giết người|bắt cóc|đe dọa|khủng bố|hiếp|cưỡng/i.test(lowerMessage)) {
      detectedTypes.add('SECURITY');
      info.supportRequired.police = true;
    }

    // MEDICAL - Cấp cứu y tế
    if (/tai nạn|va chạm|đâm xe|lật xe|tai nạn giao thông/i.test(lowerMessage)) {
      detectedTypes.add('MEDICAL');
      info.supportRequired.ambulance = true;
    }
    if (/bị thương|chảy máu|gãy xương|bỏng|vết thương/i.test(lowerMessage)) {
      detectedTypes.add('MEDICAL');
      info.supportRequired.ambulance = true;
    }
    if (/bất tỉnh|ngất|khó thở|đau tim|đột quỵ|nhồi máu|co giật/i.test(lowerMessage)) {
      detectedTypes.add('MEDICAL');
      info.supportRequired.ambulance = true;
    }
    if (/ngộ độc|sốc|sinh con|đẻ|người già ngã/i.test(lowerMessage)) {
      detectedTypes.add('MEDICAL');
      info.supportRequired.ambulance = true;
    }

    // FIRE_RESCUE - PCCC & Cứu nạn cứu hộ
    if (/cháy|lửa|khói|nổ|gas|bốc cháy|hỏa hoạn/i.test(lowerMessage)) {
      detectedTypes.add('FIRE_RESCUE');
      info.supportRequired.fireDepartment = true;
      info.supportRequired.rescue = true;
    }
    if (/mắc kẹt|sập|đổ|kẹt thang máy|kẹt trong|đống đổ nát/i.test(lowerMessage)) {
      detectedTypes.add('FIRE_RESCUE');
      info.supportRequired.rescue = true;
    }
    if (/đuối nước|chìm|nhảy sông|nhảy cầu|rơi xuống nước|lũ lụt/i.test(lowerMessage)) {
      detectedTypes.add('FIRE_RESCUE');
      info.supportRequired.rescue = true;
    }
    if (/ngập|lũ|sạt lở|động đất|bão/i.test(lowerMessage)) {
      detectedTypes.add('FIRE_RESCUE');
      info.supportRequired.rescue = true;
    }

    // Cập nhật emergencyTypes array
    info.emergencyTypes = Array.from(detectedTypes);

    // Xác định loại chính (emergencyType) theo thứ tự ưu tiên
    // Ưu tiên: SECURITY > FIRE_RESCUE > MEDICAL (tùy tình huống)
    if (info.emergencyTypes.length > 0) {
      // Nếu chỉ có 1 loại
      if (info.emergencyTypes.length === 1) {
        info.emergencyType = info.emergencyTypes[0];
      } else {
        // Nếu có nhiều loại, ưu tiên theo ngữ cảnh
        if (info.emergencyTypes.includes('FIRE_RESCUE')) {
          info.emergencyType = 'FIRE_RESCUE'; // Cháy nổ ưu tiên cao nhất
        } else if (info.emergencyTypes.includes('SECURITY')) {
          info.emergencyType = 'SECURITY';
        } else {
          info.emergencyType = 'MEDICAL';
        }
      }
    }

    // Extract number of people
    const peoplePatterns = [
      /(\d+)\s*(?:người|nạn nhân|victim)/i,
      /(?:có|khoảng|chừng|tầm)\s*(\d+)\s*(?:người|nạn nhân)/i
    ];

    for (const pattern of peoplePatterns) {
      const match = message.match(pattern);
      if (match) {
        info.affectedPeople.total = parseInt(match[1]) || 0;
        break;
      }
    }

    // Extract injured count
    const injuredMatch = message.match(/(\d+)\s*(?:người)?\s*(?:bị thương|bị bỏng|injured)/i);
    if (injuredMatch) {
      info.affectedPeople.injured = parseInt(injuredMatch[1]) || 0;
    }

    // Extract critical count
    const criticalMatch = message.match(/(\d+)\s*(?:người)?\s*(?:nguy kịch|nặng|critical|serious)/i);
    if (criticalMatch) {
      info.affectedPeople.critical = parseInt(criticalMatch[1]) || 0;
    }

    // Determine priority
    if (/chết|tử vong|nguy kịch|bất tỉnh|không thở|đang cháy lớn/i.test(lowerMessage)) {
      info.priority = 'CRITICAL';
    } else if (/nặng|nghiêm trọng|khẩn cấp|gấp/i.test(lowerMessage)) {
      info.priority = 'HIGH';
    }

    // Store description
    if (!info.description && message.length > 10) {
      info.description = message.substring(0, 200);
    }
  }

  // Extract JSON from AI response
  extractJsonFromResponse(response) {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('Could not parse JSON from AI response');
      }
    }
    return null;
  }

  // Merge JSON data from AI response
  mergeJsonData(info, jsonData) {
    if (jsonData.location) {
      info.location = jsonData.location;
    }
    if (jsonData.emergencyType) {
      info.emergencyType = jsonData.emergencyType;
    }
    if (jsonData.description) {
      info.description = jsonData.description;
    }
    if (jsonData.reporter) {
      if (jsonData.reporter.name) info.reporter.name = jsonData.reporter.name;
      if (jsonData.reporter.phone) info.reporter.phone = jsonData.reporter.phone;
    }
    if (jsonData.affectedPeople) {
      if (jsonData.affectedPeople.total) info.affectedPeople.total = jsonData.affectedPeople.total;
      if (jsonData.affectedPeople.injured) info.affectedPeople.injured = jsonData.affectedPeople.injured;
      if (jsonData.affectedPeople.critical) info.affectedPeople.critical = jsonData.affectedPeople.critical;
    }
    if (jsonData.supportRequired) {
      Object.assign(info.supportRequired, jsonData.supportRequired);
    }
    if (jsonData.priority) {
      info.priority = jsonData.priority;
    }
  }

  // Get summary of collected info
  getCollectedSummary(info) {
    const parts = [];
    if (info.location) parts.push(`Địa chỉ: ${info.location}`);
    if (info.emergencyType) parts.push(`Loại: ${info.emergencyType}`);
    if (info.reporter.phone) parts.push(`SĐT: ${info.reporter.phone}`);
    if (info.affectedPeople.total > 0) parts.push(`Số người: ${info.affectedPeople.total}`);
    return parts.join(', ');
  }

  // Check if we have enough information to create a ticket
  isTicketReady(info) {
    // Must have location with ward/city (quận/huyện is NOT required)
    const hasValidLocation = info.location && (
      info.location.toLowerCase().includes('phường') ||
      info.location.toLowerCase().includes('xã') ||
      info.location.toLowerCase().includes('thành phố') ||
      info.location.toLowerCase().includes('tp.') ||
      info.location.toLowerCase().includes('tỉnh') ||
      info.location.toLowerCase().includes('ward') ||
      info.location.includes(',') // Has multiple parts
    );

    // Must have at least one emergency type
    const hasEmergencyType = (info.emergencyTypes && info.emergencyTypes.length > 0) ||
      (info.emergencyType && ['FIRE_RESCUE', 'MEDICAL', 'SECURITY'].includes(info.emergencyType));

    // Must have phone number
    const hasPhone = info.reporter.phone && info.reporter.phone.length >= 9;

    // QUAN TRỌNG: Phải có số người bị ảnh hưởng ĐƯỢC XÁC NHẬN
    const hasAffectedPeople = info.affectedPeople.total > 0;
    
    // QUAN TRỌNG: Người dùng PHẢI xác nhận thông tin trước khi tạo phiếu
    const userHasConfirmed = info.userConfirmed === true;

    return !!(hasValidLocation && hasEmergencyType && hasPhone && hasAffectedPeople && userHasConfirmed);
  }

  // Build ticket info object for response
  buildTicketInfo(info) {
    return {
      location: info.location,
      landmarks: info.locationDetails.landmarks,
      emergencyTypes: info.emergencyTypes || [], // Mảng các loại khẩn cấp
      emergencyType: info.emergencyType, // Loại chính (tương thích ngược)
      description: info.description,
      reporter: {
        name: info.reporter.name,
        phone: info.reporter.phone
      },
      affectedPeople: {
        total: info.affectedPeople.total || 1,
        injured: info.affectedPeople.injured,
        critical: info.affectedPeople.critical
      },
      supportRequired: info.supportRequired,
      priority: info.priority
    };
  }

  // Fallback response when OpenAI is unavailable
  async fallbackResponse(message, info, sessionId) {
    // Extract info from current message
    this.extractInfoFromMessage(message, info);

    let response = '';

    // Check what's missing and ask for it
    if (!info.location || (!info.locationDetails.ward && !info.locationDetails.city)) {
      response = 'Bạn đang ở đâu? Cho tôi địa chỉ chính xác (số nhà, tên đường, phường/xã, tỉnh/thành phố).';
    } else if (!info.emergencyType) {
      response = 'Chuyện gì đang xảy ra? Có cháy, tai nạn, hay cần công an?';
    } else if (!info.reporter.phone) {
      response = 'Số điện thoại của bạn là gì để lực lượng cứu hộ liên hệ?';
    } else if (info.affectedPeople.total === 0) {
      response = 'Có bao nhiêu người cần trợ giúp? Có ai bị thương không?';
    } else {
      // All info collected - Xây dựng danh sách lực lượng cần điều động
      const forces = [];
      if (info.supportRequired.police) forces.push('Công an');
      if (info.supportRequired.fireDepartment) forces.push('Cứu hỏa');
      if (info.supportRequired.ambulance) forces.push('Cấp cứu');
      if (info.supportRequired.rescue && !info.supportRequired.fireDepartment) forces.push('Cứu hộ');
      const forcesStr = forces.length > 0 ? forces.join(', ') : 'Lực lượng cứu hộ';
      
      // Map loại tình huống sang tiếng Việt
      const emergencyTypeMap = {
        'FIRE_RESCUE': 'PCCC & Cứu nạn cứu hộ',
        'MEDICAL': 'Cấp cứu y tế',
        'SECURITY': 'An ninh'
      };
      const emergencyTypes = info.emergencyTypes || [info.emergencyType];
      const emergencyTypesVi = emergencyTypes.map(t => emergencyTypeMap[t] || t).join(', ');
      
      // Nếu chưa hiển thị xác nhận -> hiển thị xác nhận
      if (!info.confirmationShown) {
        info.confirmationShown = true;
        response = `📋 **XÁC NHẬN THÔNG TIN PHIẾU KHẨN CẤP:**

• **Địa điểm:** ${info.location}
• **Loại tình huống:** ${emergencyTypesVi}
• **Số điện thoại:** ${info.reporter.phone}
• **Số người bị ảnh hưởng:** ${info.affectedPeople.total} người

🚨 **Lực lượng sẽ điều động:** ${forcesStr}

⚠️ **Vui lòng xác nhận thông tin trên đã chính xác?** (Trả lời "Đúng" hoặc "Xác nhận" để tạo phiếu khẩn cấp)`;
      } else if (!info.userConfirmed) {
        // Kiểm tra người dùng xác nhận
        const confirmKeywords = ['đúng', 'xác nhận', 'ok', 'yes', 'đúng rồi', 'chính xác', 'đồng ý', 'oke', 'ừ', 'uh', 'vâng'];
        const lowerMessage = message.toLowerCase().trim();
        
        if (confirmKeywords.some(keyword => lowerMessage.includes(keyword))) {
          info.userConfirmed = true;
          response = `✅ Đã xác nhận! Đang tạo phiếu khẩn cấp...`;
        } else {
          response = `⚠️ Vui lòng xác nhận thông tin đã chính xác bằng cách trả lời "Đúng" hoặc "Xác nhận". Nếu có thông tin sai, vui lòng cho biết để sửa lại.`;
        }
      }
    }

    const ticketInfo = this.buildTicketInfo(info);
    const isReady = this.isTicketReady(info);

    return {
      response: response,
      ticketInfo: ticketInfo,
      shouldCreateTicket: isReady
    };
  }

  // Clear conversation history for a session
  clearSession(sessionId) {
    this.conversationHistory.delete(sessionId);
    this.collectedInfo.delete(sessionId);
  }

  // Get conversation history for debugging
  getSessionHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }
}

module.exports = new OpenAIService();
