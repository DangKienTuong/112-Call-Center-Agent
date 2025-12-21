const { z } = require('zod');

/**
 * Zod schemas for structured LLM output extraction
 * These replace the fragile regex patterns in the old system
 */

/**
 * Schema for extracting all information from a user message
 */
const ExtractedInfoSchema = z.object({
  location: z.object({
    address: z.string().optional().describe('Số nhà và tên đường (e.g., "123 Nguyễn Huệ")'),
    ward: z.string().optional().describe('Phường/Xã'),
    district: z.string().optional().describe('Quận/Huyện (optional)'),
    city: z.string().optional().describe('Tỉnh/Thành phố'),
  }).optional().describe('Địa chỉ chi tiết của tình huống khẩn cấp'),
  
  emergencyTypes: z.array(
    z.enum(['FIRE_RESCUE', 'MEDICAL', 'SECURITY'])
  ).optional().describe(`Loại tình huống khẩn cấp (có thể nhiều loại):
    - FIRE_RESCUE: cháy, nổ, mắc kẹt, đuối nước, sập đổ, cứu hộ
    - MEDICAL: tai nạn, bị thương, bệnh nặng, ngất, bất tỉnh, cấp cứu
    - SECURITY: trộm, cướp, đánh nhau, giết người, gây rối trật tự`),
  
  phone: z.string().optional().describe('Số điện thoại liên hệ Việt Nam (10 chữ số bắt đầu bằng 09/03/07/08/05 hoặc +84 theo sau 9 chữ số). Ví dụ: 0912345678 hoặc +84912345678'),
  
  affectedPeople: z.object({
    total: z.number().optional().describe('Tổng số người bị ảnh hưởng'),
    injured: z.number().optional().describe('Số người bị thương'),
    critical: z.number().optional().describe('Số người nguy kịch'),
  }).optional().describe('Thông tin về số người bị ảnh hưởng'),
  
  supportRequired: z.object({
    police: z.boolean().optional().describe('Cần công an'),
    ambulance: z.boolean().optional().describe('Cần xe cấp cứu'),
    fireDepartment: z.boolean().optional().describe('Cần xe cứu hỏa'),
    rescue: z.boolean().optional().describe('Cần đội cứu hộ'),
  }).optional().describe('Các lực lượng cần điều động'),
  
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
    .describe('Mức độ ưu tiên: CRITICAL nếu có người chết/nguy kịch/đang cháy lớn'),
  
  description: z.string().optional().describe('Mô tả chi tiết tình huống'),
  
  reporterName: z.string().optional().describe('Tên người báo tin'),
});

/**
 * Schema for checking user confirmation
 */
const ConfirmationCheckSchema = z.object({
  isConfirming: z.boolean().describe('true nếu người dùng đang xác nhận thông tin (đúng, ok, xác nhận, yes, vâng, uh, ừ, đồng ý, chính xác)'),
  isCorrection: z.boolean().describe('true nếu người dùng đang sửa/thay đổi thông tin'),
  correctionDetails: z.string().optional().describe('Thông tin cần sửa nếu có'),
});

/**
 * Schema for determining emergency priority
 */
const PriorityAssessmentSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reasoning: z.string().describe('Lý do đánh giá mức độ ưu tiên'),
});

/**
 * Helper function to create extraction prompt
 */
function createExtractionPrompt(message, context = {}) {
  const contextInfo = context.collectedInfo ? 
    `\n\nThông tin đã thu thập trước đó:\n${JSON.stringify(context.collectedInfo, null, 2)}` : '';
  
  const lastQuestionInfo = context.lastOperatorMessage ?
    `\n\nCâu hỏi vừa được hỏi: "${context.lastOperatorMessage}"` : '';
  
  return `Bạn là hệ thống trích xuất thông tin cho tổng đài khẩn cấp 112.
Nhiệm vụ: Phân tích tin nhắn của người dùng và trích xuất TẤT CẢ thông tin có liên quan.

Tin nhắn người dùng: "${message}"
${contextInfo}${lastQuestionInfo}

Quy tắc quan trọng:
1. CHỈ trích xuất thông tin MỚI có TRỰC TIẾP trong tin nhắn người dùng
2. KHÔNG trích xuất lại thông tin đã có trong "Thông tin đã thu thập trước đó"
3. Nếu tin nhắn chỉ chứa địa chỉ → chỉ trả về location, KHÔNG trả về phone/emergencyTypes
4. Nếu tin nhắn chỉ chứa số điện thoại → chỉ trả về phone, KHÔNG trả về location
5. Nếu không có thông tin MỚI nào, trả về object rỗng {}
6. Nếu câu trả lời là số đơn giản và câu hỏi liên quan đến số người, trích xuất vào affectedPeople.total
7. emergencyTypes phải chính xác:
   - Từ khóa trộm/cướp/đánh nhau/gây rối → SECURITY
   - Từ khóa cháy/nổ/mắc kẹt/đuối nước → FIRE_RESCUE
   - Từ khóa tai nạn/bị thương/bất tỉnh/cấp cứu → MEDICAL
   - Có thể có nhiều loại cùng lúc
8. Địa chỉ phải đầy đủ: số nhà, đường, phường/xã, thành phố
9. Số điện thoại PHẢI là số Việt Nam hợp lệ:
   - 10 chữ số bắt đầu bằng: 09x, 03x, 07x, 08x, 05x (ví dụ: 0912345678)
   - HOẶC +84 theo sau 9 chữ số (ví dụ: +84912345678)
   - Trích xuất CHÍNH XÁC số điện thoại từ tin nhắn, giữ nguyên format
   - KHÔNG trích xuất số điện thoại từ "Thông tin đã thu thập trước đó"

Trích xuất thông tin:`;
}

/**
 * Helper to determine which support is required based on emergency types
 */
function determineSupportRequired(emergencyTypes) {
  const support = {
    police: false,
    ambulance: false,
    fireDepartment: false,
    rescue: false,
  };
  
  if (!emergencyTypes || emergencyTypes.length === 0) return support;
  
  if (emergencyTypes.includes('SECURITY')) {
    support.police = true;
  }
  
  if (emergencyTypes.includes('MEDICAL')) {
    support.ambulance = true;
  }
  
  if (emergencyTypes.includes('FIRE_RESCUE')) {
    support.fireDepartment = true;
    support.rescue = true;
  }
  
  return support;
}

/**
 * Schema for vehicle requirements analysis
 */
const VehicleRequirementsSchema = z.object({
  ambulances: z.number().describe('Số xe cấp cứu cần thiết (0-5)'),
  policeCars: z.number().describe('Số xe công an cần thiết (0-5)'),
  fireTrucks: z.number().describe('Số xe cứu hỏa cần thiết (0-5)'),
  reasoning: z.string().describe('Lý do phân tích số lượng xe'),
});

/**
 * Analyze and determine vehicle requirements using AI
 * @param {string} description - Description of the emergency
 * @param {Array<string>} emergencyTypes - Array of emergency types
 * @param {Object} affectedPeople - Object with total, injured, critical counts
 * @returns {Promise<Object>} Vehicle requirements { ambulances, policeCars, fireTrucks, reasoning }
 */
async function analyzeVehicleRequirements(description, emergencyTypes, affectedPeople = {}) {
  try {
    const { ChatOpenAI } = require('@langchain/openai');
    
    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.1,
    });
    
    const analysisModel = model.withStructuredOutput(VehicleRequirementsSchema);
    
    const prompt = `Bạn là chuyên gia phân tích tình huống khẩn cấp cho tổng đài 112.
Nhiệm vụ: Xác định số lượng xe cứu hộ cần thiết dựa trên thông tin tình huống.

THÔNG TIN TÌNH HUỐNG:
- Loại khẩn cấp: ${emergencyTypes.join(', ')}
- Mô tả: ${description || 'Không có mô tả chi tiết'}
- Số người bị ảnh hưởng: ${affectedPeople.total || 'Không rõ'}
- Số người bị thương: ${affectedPeople.injured || 'Không rõ'}
- Số người nguy kịch: ${affectedPeople.critical || 'Không rõ'}

QUY TẮC PHÂN TÍCH:

1. XE CẤP CỨU (AMBULANCES):
   - 1 xe: 1-3 người bị thương/bệnh nhẹ
   - 2 xe: 4-6 người hoặc có 1-2 người nguy kịch
   - 3 xe: >6 người hoặc >2 người nguy kịch, tai nạn lớn
   - Nếu không rõ số người: mặc định 1 xe

2. XE CÔNG AN (POLICE_CARS):
   - 1 xe: Trộm/cướp thông thường, đánh nhau nhỏ
   - 2 xe: Cướp có vũ khí, đánh nhau đông người
   - 3 xe: Tình huống nghiêm trọng (giết người, bạo loạn)
   - Nếu không rõ mức độ: mặc định 1 xe

3. XE CỨU HỎA (FIRE_TRUCKS):
   - 1 xe: Cháy nhỏ (1 phòng, xe máy), mắc kẹt đơn giản
   - 2 xe: Cháy nhà 1-2 tầng, tai nạn giao thông có kẹt
   - 3-4 xe: Cháy lớn (nhiều tầng, xưởng), nổ, sập đổ
   - Nếu không rõ quy mô: mặc định 1 xe

LƯU Ý:
- Nếu emergencyTypes không chứa loại nào, số xe tương ứng = 0
- Ưu tiên an toàn: nghi ngờ thì tăng số lượng
- Tối đa 5 xe mỗi loại

Phân tích và trả về số lượng xe cần thiết:`;

    const result = await analysisModel.invoke(prompt);
    
    console.log('[VehicleAnalyzer] AI Analysis:', result);
    
    return {
      ambulances: result.ambulances || 0,
      policeCars: result.policeCars || 0,
      fireTrucks: result.fireTrucks || 0,
      reasoning: result.reasoning || 'Phân tích tự động'
    };
    
  } catch (error) {
    console.error('[VehicleAnalyzer] Error analyzing vehicle requirements:', error);
    
    // Fallback to simple rule-based logic
    return fallbackVehicleAnalysis(emergencyTypes, affectedPeople);
  }
}

/**
 * Fallback vehicle analysis using simple rules (no AI)
 * @param {Array<string>} emergencyTypes - Emergency types
 * @param {Object} affectedPeople - Affected people counts
 * @returns {Object} Vehicle requirements
 */
function fallbackVehicleAnalysis(emergencyTypes, affectedPeople = {}) {
  const requirements = {
    ambulances: 0,
    policeCars: 0,
    fireTrucks: 0,
    reasoning: 'Phân tích dự phòng (không dùng AI)'
  };
  
  if (!emergencyTypes || emergencyTypes.length === 0) {
    return requirements;
  }
  
  // MEDICAL emergency
  if (emergencyTypes.includes('MEDICAL')) {
    const total = affectedPeople.total || 1;
    const critical = affectedPeople.critical || 0;
    
    if (critical > 2 || total > 6) {
      requirements.ambulances = 3;
    } else if (critical > 0 || total > 3) {
      requirements.ambulances = 2;
    } else {
      requirements.ambulances = 1;
    }
  }
  
  // SECURITY emergency
  if (emergencyTypes.includes('SECURITY')) {
    requirements.policeCars = 1; // Default to 1
  }
  
  // FIRE_RESCUE emergency
  if (emergencyTypes.includes('FIRE_RESCUE')) {
    requirements.fireTrucks = 2; // Default to 2 for fire incidents
  }
  
  return requirements;
}

module.exports = {
  ExtractedInfoSchema,
  ConfirmationCheckSchema,
  PriorityAssessmentSchema,
  VehicleRequirementsSchema,
  createExtractionPrompt,
  determineSupportRequired,
  analyzeVehicleRequirements,
  fallbackVehicleAnalysis,
};

