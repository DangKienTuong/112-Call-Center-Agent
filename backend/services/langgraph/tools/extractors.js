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
1. Chỉ trích xuất thông tin CÓ TRONG tin nhắn, KHÔNG bịa ra
2. Nếu không có thông tin nào, trả về object rỗng {}
3. Nếu câu trả lời là số đơn giản và câu hỏi liên quan đến số người, trích xuất vào affectedPeople.total
4. emergencyTypes phải chính xác:
   - Từ khóa trộm/cướp/đánh nhau/gây rối → SECURITY
   - Từ khóa cháy/nổ/mắc kẹt/đuối nước → FIRE_RESCUE
   - Từ khóa tai nạn/bị thương/bất tỉnh/cấp cứu → MEDICAL
   - Có thể có nhiều loại cùng lúc
5. Địa chỉ phải đầy đủ: số nhà, đường, phường/xã, thành phố
6. Số điện thoại PHẢI là số Việt Nam hợp lệ:
   - 10 chữ số bắt đầu bằng: 09x, 03x, 07x, 08x, 05x (ví dụ: 0912345678)
   - HOẶC +84 theo sau 9 chữ số (ví dụ: +84912345678)
   - Trích xuất CHÍNH XÁC số điện thoại từ tin nhắn, giữ nguyên format

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

module.exports = {
  ExtractedInfoSchema,
  ConfirmationCheckSchema,
  PriorityAssessmentSchema,
  createExtractionPrompt,
  determineSupportRequired,
};

