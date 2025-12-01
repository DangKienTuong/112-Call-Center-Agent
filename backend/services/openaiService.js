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
    1. Địa chỉ đầy đủ (số nhà, đường, quận/huyện, thành phố)
    2. Loại tình huống (FIRE_RESCUE/MEDICAL/SECURITY)
    3. Số điện thoại liên hệ
    4. Số người bị ảnh hưởng

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
        emergencyType: null,
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
        priority: 'HIGH'
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
        return this.fallbackResponse(message, sessionInfo, sessionId);
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

      // Extract any additional info from AI response text
      this.extractInfoFromMessage(aiResponse, sessionInfo);

      // Check if ticket is ready
      const isReady = this.isTicketReady(sessionInfo);

      // Build final ticket info for response
      const ticketInfo = this.buildTicketInfo(sessionInfo);

      return {
        response: aiResponse,
        ticketInfo: ticketInfo,
        shouldCreateTicket: isReady
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      const sessionInfo = this.getSessionInfo(sessionId);
      return this.fallbackResponse(message, sessionInfo, sessionId);
    }
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

    // Extract emergency type from keywords
    if (/cháy|lửa|khói|nổ|gas|bốc cháy/i.test(lowerMessage)) {
      info.emergencyType = 'FIRE_RESCUE';
      info.supportRequired.fireDepartment = true;
      info.supportRequired.rescue = true;
    } else if (/sập|đổ|kẹt|mắc kẹt|ngập|đuối nước|chìm/i.test(lowerMessage)) {
      info.emergencyType = 'FIRE_RESCUE';
      info.supportRequired.rescue = true;
    } else if (/tai nạn|đâm|va chạm|xe|chảy máu|gãy|bị thương/i.test(lowerMessage)) {
      info.emergencyType = 'MEDICAL';
      info.supportRequired.ambulance = true;
    } else if (/bệnh|đau|bất tỉnh|ngất|khó thở|đột quỵ|nhồi máu/i.test(lowerMessage)) {
      info.emergencyType = 'MEDICAL';
      info.supportRequired.ambulance = true;
    } else if (/cướp|trộm|đánh|đánh nhau|côn đồ|bạo lực|xô xát/i.test(lowerMessage)) {
      info.emergencyType = 'SECURITY';
      info.supportRequired.police = true;
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
    // Must have location with district/city
    const hasValidLocation = info.location && (
      info.location.toLowerCase().includes('quận') ||
      info.location.toLowerCase().includes('huyện') ||
      info.location.toLowerCase().includes('phường') ||
      info.location.toLowerCase().includes('thành phố') ||
      info.location.toLowerCase().includes('tp.') ||
      info.location.toLowerCase().includes('district') ||
      info.location.toLowerCase().includes('ward') ||
      info.location.includes(',') // Has multiple parts
    );

    // Must have emergency type
    const hasEmergencyType = info.emergencyType &&
      ['FIRE_RESCUE', 'MEDICAL', 'SECURITY'].includes(info.emergencyType);

    // Must have phone number
    const hasPhone = info.reporter.phone && info.reporter.phone.length >= 9;

    // Must have some info about affected people (at least we know there's someone)
    const hasAffectedInfo = info.affectedPeople.total > 0 || info.description;

    return !!(hasValidLocation && hasEmergencyType && hasPhone && hasAffectedInfo);
  }

  // Build ticket info object for response
  buildTicketInfo(info) {
    return {
      location: info.location,
      landmarks: info.locationDetails.landmarks,
      emergencyType: info.emergencyType,
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
  fallbackResponse(message, info, sessionId) {
    // Extract info from current message
    this.extractInfoFromMessage(message, info);

    let response = '';
    const missingInfo = [];

    // Check what's missing and ask for it
    if (!info.location || !info.locationDetails.district) {
      response = 'Bạn đang ở đâu? Cho tôi địa chỉ chính xác (số nhà, tên đường, quận/huyện, thành phố).';
      missingInfo.push('location');
    } else if (!info.emergencyType) {
      response = 'Chuyện gì đang xảy ra? Có cháy, tai nạn, hay cần công an?';
      missingInfo.push('emergencyType');
    } else if (!info.reporter.phone) {
      response = 'Số điện thoại của bạn là gì để lực lượng cứu hộ liên hệ?';
      missingInfo.push('phone');
    } else if (info.affectedPeople.total === 0) {
      response = 'Có bao nhiêu người cần trợ giúp? Có ai bị thương không?';
      missingInfo.push('affectedPeople');
    } else {
      // All info collected
      const emergencyTypeVi = {
        'FIRE_RESCUE': 'PCCC & Cứu nạn cứu hộ',
        'MEDICAL': 'Cấp cứu y tế',
        'SECURITY': 'An ninh'
      };
      response = `Đã ghi nhận thông tin. Lực lượng ${emergencyTypeVi[info.emergencyType] || info.emergencyType} đang được điều động đến ${info.location}!`;
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
