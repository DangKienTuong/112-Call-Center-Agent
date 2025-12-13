const { buildTicketInfo } = require('../state');

/**
 * Confirmation Node
 * Shows summary of collected information and asks user to confirm
 */
async function showConfirmationNode(state) {
  console.log('[ShowConfirmation] Building confirmation message');
  
  // Build location string
  const locationParts = [
    state.location.address,
    state.location.ward,
    state.location.district,
    state.location.city
  ].filter(Boolean);
  const locationStr = locationParts.join(', ');
  
  // Map emergency types to Vietnamese
  const emergencyTypeMap = {
    'FIRE_RESCUE': 'PCCC & Cứu nạn cứu hộ',
    'MEDICAL': 'Cấp cứu y tế',
    'SECURITY': 'An ninh'
  };
  const emergencyTypesVi = state.emergencyTypes
    .map(t => emergencyTypeMap[t] || t)
    .join(', ');
  
  // Build list of forces to be dispatched
  const forces = [];
  if (state.supportRequired.police) forces.push('Công an');
  if (state.supportRequired.fireDepartment) forces.push('Cứu hỏa');
  if (state.supportRequired.ambulance) forces.push('Cấp cứu');
  if (state.supportRequired.rescue && !state.supportRequired.fireDepartment) {
    forces.push('Cứu hộ');
  }
  const forcesStr = forces.length > 0 ? forces.join(', ') : 'Lực lượng cứu hộ';
  
  // Build confirmation message
  const confirmationMessage = `📋 **XÁC NHẬN THÔNG TIN PHIẾU KHẨN CẤP:**

• **Địa điểm:** ${locationStr}
• **Loại tình huống:** ${emergencyTypesVi}
• **Số điện thoại:** ${state.phone}
• **Số người bị ảnh hưởng:** ${state.affectedPeople.total} người

🚨 **Lực lượng sẽ điều động:** ${forcesStr}

⚠️ **Vui lòng xác nhận thông tin trên đã chính xác?** (Trả lời "Đúng" hoặc "Xác nhận" để tạo phiếu khẩn cấp)`;
  
  return {
    response: confirmationMessage,
    confirmationShown: true,
    messages: [{
      role: 'operator',
      message: confirmationMessage,
      timestamp: new Date(),
    }],
  };
}

/**
 * Create Ticket Node
 * Creates the emergency ticket in the system
 * This is called after user confirms the information
 */
async function createTicketNode(state) {
  console.log('[CreateTicket] User confirmed, building ticket info');
  
  // Build ticket info from state
  const ticketInfo = buildTicketInfo(state);
  
  // The actual ticket creation will be done by the controller
  // This node just prepares the ticket info
  
  return {
    ticketInfo: ticketInfo,
    shouldCreateTicket: true,
    response: '✅ Đang tạo phiếu khẩn cấp...',
  };
}

module.exports = {
  showConfirmationNode,
  createTicketNode,
};

