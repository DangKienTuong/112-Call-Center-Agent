const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.systemPrompt = null;
    this.conversationHistory = new Map(); // Store conversation history per session
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
    return `You are a professional emergency 112 hotline operator.
    Your role is to receive and process emergency reports.
    ALWAYS prioritize obtaining the caller's EXACT LOCATION first.
    Remain calm, professional, and empathetic.
    Extract information efficiently and provide appropriate emergency guidance.`;
  }

  // Process a message using OpenAI
  async processMessage(message, sessionId, context = []) {
    try {
      // Get or create conversation history for this session
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, []);
      }

      const sessionHistory = this.conversationHistory.get(sessionId);

      // Build messages array for OpenAI
      const messages = [
        { role: 'system', content: this.systemPrompt }
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

      // Add current message
      messages.push({ role: 'user', content: message });

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview', // Note: GPT-5 doesn't exist yet, using GPT-4 Turbo
        messages: messages,
        temperature: 0.3, // Lower temperature for more consistent emergency responses
        max_tokens: 500,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const aiResponse = completion.choices[0].message.content;

      // Update conversation history
      sessionHistory.push({ role: 'user', content: message });
      sessionHistory.push({ role: 'assistant', content: aiResponse });

      // Keep only last 20 messages to avoid token limits
      if (sessionHistory.length > 20) {
        sessionHistory.splice(0, sessionHistory.length - 20);
      }

      // Extract structured information from the response
      const ticketInfo = this.extractTicketInfo(aiResponse, context, message);

      return {
        response: aiResponse,
        ticketInfo: ticketInfo,
        shouldCreateTicket: this.isTicketReady(ticketInfo)
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);

      // Fallback to basic extraction if OpenAI fails
      return this.fallbackResponse(message, context);
    }
  }

  // Extract ticket information from AI response and conversation
  extractTicketInfo(aiResponse, context, userMessage) {
    const info = {
      location: null,
      emergencyType: null,
      severity: 'URGENT',
      description: null,
      reporter: {
        name: null,
        phone: null,
        relationship: null
      },
      affectedPeople: {
        total: 0,
        injured: 0,
        status: null
      },
      supportRequired: {
        police: false,
        ambulance: false,
        fireDepartment: false,
        rescue: false
      },
      additionalInfo: null
    };

    // Build messages array properly
    const messages = [];
    if (context && context.length > 0) {
      context.forEach(msg => messages.push(msg.message));
    }
    if (userMessage) {
      messages.push(userMessage);
    }
    if (aiResponse) {
      messages.push(aiResponse);
    }

    const allMessages = messages.join(' ');

    // Try to extract JSON if AI provided structured data
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return { ...info, ...parsed };
      } catch (e) {
        console.log('Could not parse JSON from AI response');
      }
    }

    // Manual extraction from conversation
    const lowerText = allMessages.toLowerCase();

    // Extract location - search each message individually first
    const locationPatterns = [
      /(\d+\s+[\w\s]+(?:street|road|avenue|st|rd|ave))/i,
      /(\d+\s+[\w\s]+(?:đường|phố|quận))/i,
      /(?:at|location|address|i'm at|we're at)\s*:?\s*([^,.]+(?:,\s*[^,.]+)*)/i
    ];

    // Search messages individually to avoid concatenation issues
    for (const msg of messages) {
      if (!info.location && msg) {
        for (const pattern of locationPatterns) {
          const match = msg.match(pattern);
          if (match) {
            info.location = match[1].trim();
            break;
          }
        }
      }
      if (info.location) break;
    }

    // Determine emergency type
    if (/fire|cháy|smoke|khói|burn/i.test(lowerText)) {
      info.emergencyType = 'FIRE';
      info.supportRequired.fireDepartment = true;
    } else if (/medical|injured|hurt|sick|accident|tai nạn|bị thương|ambulance/i.test(lowerText)) {
      info.emergencyType = 'MEDICAL';
      info.supportRequired.ambulance = true;
    } else if (/crime|robbery|theft|assault|attack|cướp|trộm|tấn công|police/i.test(lowerText)) {
      info.emergencyType = 'SECURITY';
      info.supportRequired.police = true;
    } else if (/rescue|trapped|stuck|flood|collapse|cứu|mắc kẹt|sập/i.test(lowerText)) {
      info.emergencyType = 'RESCUE';
      info.supportRequired.rescue = true;
    }

    // Determine severity
    if (/critical|dying|unconscious|not breathing|severe|nghiêm trọng/i.test(lowerText)) {
      info.severity = 'CRITICAL';
    } else if (/urgent|serious|bad|immediately/i.test(lowerText)) {
      info.severity = 'URGENT';
    } else {
      info.severity = 'MODERATE';
    }

    // Extract phone number
    const phonePatterns = [
      /(?:0|\+84)[0-9]{9,10}/,
      /\d{3}[-.]?\d{3}[-.]?\d{4}/,
      /(?:phone|số điện thoại|contact)\s*:?\s*([\d\s\-\.]+)/i
    ];

    for (const pattern of phonePatterns) {
      const match = allMessages.match(pattern);
      if (match) {
        info.reporter.phone = match[0].replace(/[\s\-\.]/g, '');
        break;
      }
    }

    // Extract name
    const nameMatch = allMessages.match(/(?:name is|my name|tên|i am)\s*:?\s*([A-Za-zÀ-ỹ\s]+)/i);
    if (nameMatch) {
      info.reporter.name = nameMatch[1].trim();
    }

    // Extract people count
    const peopleMatch = allMessages.match(/(\d+)\s*(?:people|person|người|victims|nạn nhân)/i);
    if (peopleMatch) {
      info.affectedPeople.total = parseInt(peopleMatch[1]);
    }

    // Set description
    info.description = userMessage;

    return info;
  }

  // Check if we have enough information to create a ticket
  isTicketReady(info) {
    return !!(
      info.location &&
      info.emergencyType &&
      (info.reporter.phone || info.reporter.name)
    );
  }

  // Fallback response when OpenAI is unavailable
  fallbackResponse(message, context) {
    // Build proper context array for extraction
    const fullContext = context || [];
    const ticketInfo = this.extractTicketInfo('', fullContext, message);
    let response = '';

    if (!ticketInfo.location) {
      response = "I need your exact location to send help. Please provide your full address including street name and number.";
    } else if (!ticketInfo.emergencyType) {
      response = "What type of emergency is this? Is someone injured, is there a fire, or is this a security issue?";
    } else if (!ticketInfo.reporter.phone) {
      response = "Please provide your phone number so emergency services can contact you.";
    } else {
      response = `I have your information. Help is being dispatched to ${ticketInfo.location}. Please stay on the line.`;
    }

    return {
      response: response,
      ticketInfo: ticketInfo,
      shouldCreateTicket: this.isTicketReady(ticketInfo)
    };
  }

  // Clear conversation history for a session
  clearSession(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  // Get conversation history for debugging
  getSessionHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }
}

module.exports = new OpenAIService();