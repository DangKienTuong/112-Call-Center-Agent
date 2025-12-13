const { ChatOpenAI } = require('@langchain/openai');
const Ticket = require('../../../models/Ticket');

/**
 * Memory Retrieval Node
 * Handles queries about user's past tickets and provides status updates
 */

// Patterns that indicate user is asking about past tickets
const TICKET_QUERY_PATTERNS = [
  /trạng thái.*phiếu/i,
  /phiếu.*của tôi/i,
  /ticket.*status/i,
  /my.*ticket/i,
  /báo cáo.*trước/i,
  /lịch sử.*báo cáo/i,
  /previous.*report/i,
  /đã báo.*trước/i,
  /tình trạng.*xử lý/i,
  /TD-\d{8}-\d{6}/i, // Ticket ID pattern
];

/**
 * Check if message is asking about past tickets
 */
function isTicketQuery(message) {
  const lowerMessage = message.toLowerCase();

  // Check patterns
  for (const pattern of TICKET_QUERY_PATTERNS) {
    if (pattern.test(message) || pattern.test(lowerMessage)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract ticket ID from message if mentioned
 */
function extractTicketId(message) {
  const match = message.match(/TD-\d{8}-\d{6}-[A-Z0-9]{4}/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Memory Retrieval Node
 * Fetches user's ticket history and provides updates
 */
async function memoryRetrievalNode(state) {
  console.log('[MemoryRetrieval] Processing query:', state.currentMessage);

  const { userMemory, currentMessage, isAuthenticated } = state;

  // If not authenticated, prompt to login
  if (!isAuthenticated || !userMemory) {
    return {
      response: `Để xem lịch sử phiếu và trạng thái xử lý, bạn cần đăng nhập vào hệ thống.

Nếu bạn cần báo cáo tình huống khẩn cấp mới, vui lòng mô tả tình huống của bạn.`,
      messages: [{
        role: 'operator',
        message: 'Yêu cầu đăng nhập để xem lịch sử',
        timestamp: new Date()
      }]
    };
  }

  // Check for specific ticket ID in message
  const ticketId = extractTicketId(currentMessage);

  if (ticketId) {
    // Query specific ticket
    return await querySpecificTicket(ticketId, userMemory);
  }

  // Show recent tickets summary
  return await showRecentTickets(userMemory);
}

/**
 * Query specific ticket by ID
 */
async function querySpecificTicket(ticketId, userMemory) {
  console.log('[MemoryRetrieval] Querying specific ticket:', ticketId);

  try {
    // Find ticket in database
    const ticket = await Ticket.findOne({ ticketId })
      .select('ticketId status emergencyTypes location description createdAt updatedAt responseTeam')
      .lean();

    if (!ticket) {
      return {
        response: `Không tìm thấy phiếu **${ticketId}**. Vui lòng kiểm tra lại mã phiếu.

Các phiếu gần đây của bạn:
${formatTicketList(userMemory.recentTickets || [])}`,
        messages: [{
          role: 'operator',
          message: `Không tìm thấy phiếu ${ticketId}`,
          timestamp: new Date()
        }]
      };
    }

    // Format ticket status response
    const statusMap = {
      URGENT: '🔴 Khẩn cấp - Đang điều động',
      IN_PROGRESS: '🟡 Đang xử lý',
      RESOLVED: '✅ Đã giải quyết',
      CANCELLED: '⚫ Đã hủy'
    };

    const emergencyTypeMap = {
      FIRE_RESCUE: 'PCCC & Cứu nạn',
      MEDICAL: 'Cấp cứu y tế',
      SECURITY: 'An ninh'
    };

    const typeNames = ticket.emergencyTypes?.map(t => emergencyTypeMap[t] || t).join(', ') || 'N/A';

    let response = `📋 **PHIẾU ${ticket.ticketId}**

**Trạng thái:** ${statusMap[ticket.status] || ticket.status}
**Loại:** ${typeNames}
**Địa điểm:** ${ticket.location?.address || 'N/A'}
**Thời gian tạo:** ${formatDate(ticket.createdAt)}`;

    // Add response team info if available
    if (ticket.responseTeam && ticket.responseTeam.length > 0) {
      response += '\n\n**Đội phản ứng:**';
      for (const team of ticket.responseTeam) {
        const teamStatus = team.status === 'ON_SCENE' ? 'Đã đến hiện trường' :
          team.status === 'EN_ROUTE' ? 'Đang di chuyển' :
            team.status === 'DISPATCHED' ? 'Đã điều động' : team.status;
        response += `\n- ${team.unit}: ${teamStatus}`;
      }
    }

    if (ticket.status === 'RESOLVED') {
      response += `\n**Thời gian xử lý xong:** ${formatDate(ticket.updatedAt)}`;
    }

    response += '\n\nBạn có cần hỗ trợ gì thêm không?';

    return {
      response,
      messages: [{
        role: 'operator',
        message: `Đã tra cứu phiếu ${ticketId}`,
        timestamp: new Date()
      }]
    };
  } catch (error) {
    console.error('[MemoryRetrieval] Error querying ticket:', error);
    return {
      response: 'Xin lỗi, không thể tra cứu thông tin phiếu lúc này. Vui lòng thử lại sau.',
      messages: [{
        role: 'operator',
        message: 'Lỗi tra cứu phiếu',
        timestamp: new Date()
      }]
    };
  }
}

/**
 * Show recent tickets summary
 */
async function showRecentTickets(userMemory) {
  console.log('[MemoryRetrieval] Showing recent tickets');

  const recentTickets = userMemory.recentTickets || [];

  if (recentTickets.length === 0) {
    return {
      response: `Bạn chưa có phiếu khẩn cấp nào trong hệ thống.

Nếu bạn cần báo cáo tình huống khẩn cấp, vui lòng mô tả tình huống và địa điểm.`,
      messages: [{
        role: 'operator',
        message: 'Không có phiếu nào',
        timestamp: new Date()
      }]
    };
  }

  // Get latest status for each ticket
  const ticketIds = recentTickets.map(t => t.ticketId);
  const latestTickets = await Ticket.find({ ticketId: { $in: ticketIds } })
    .select('ticketId status updatedAt')
    .lean();

  const statusMap = {};
  for (const t of latestTickets) {
    statusMap[t.ticketId] = t.status;
  }

  let response = `📋 **PHIẾU KHẨN CẤP CỦA BẠN** (${recentTickets.length} phiếu)\n\n`;

  const statusIcons = {
    URGENT: '🔴',
    IN_PROGRESS: '🟡',
    RESOLVED: '✅',
    CANCELLED: '⚫'
  };

  for (const ticket of recentTickets.slice(0, 5)) {
    const currentStatus = statusMap[ticket.ticketId] || ticket.status;
    const icon = statusIcons[currentStatus] || '⚪';
    response += `${icon} **${ticket.ticketId}** - ${currentStatus}\n`;
    response += `   ${ticket.location || 'N/A'} (${formatDate(ticket.date)})\n\n`;
  }

  if (recentTickets.length > 5) {
    response += `... và ${recentTickets.length - 5} phiếu khác\n\n`;
  }

  response += `Để xem chi tiết, hãy nhập mã phiếu (ví dụ: "Trạng thái phiếu TD-xxx").\n`;
  response += `Hoặc nếu bạn cần báo cáo tình huống mới, vui lòng mô tả.`;

  return {
    response,
    messages: [{
      role: 'operator',
      message: 'Hiển thị danh sách phiếu',
      timestamp: new Date()
    }]
  };
}

/**
 * Format ticket list for display
 */
function formatTicketList(tickets) {
  if (!tickets || tickets.length === 0) {
    return 'Không có phiếu nào.';
  }

  return tickets.slice(0, 3).map(t =>
    `- ${t.ticketId}: ${t.status} (${formatDate(t.date)})`
  ).join('\n');
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = {
  memoryRetrievalNode,
  isTicketQuery,
  extractTicketId
};
