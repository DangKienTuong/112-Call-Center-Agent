const Ticket = require('../models/Ticket');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create new ticket
exports.createTicket = async (req, res) => {
  try {
    const ticketData = req.body;

    // Add operator if authenticated
    if (req.user) {
      ticketData.assignedOperator = req.user._id;
    }

    const ticket = new Ticket(ticketData);
    await ticket.save();

    // Emit to all connected clients
    if (req.io) {
      req.io.emit('new_ticket', ticket);
    }

    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Emergency ticket created successfully'
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message
    });
  }
};

// Get all tickets with filters
exports.getTickets = async (req, res) => {
  try {
    const {
      status,
      emergencyType,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // If user is a reporter, only show their own tickets
    if (req.user && req.user.role === 'reporter') {
      // Match by reporter phone (from user profile)
      const userPhone = req.user.profile?.phone;
      if (userPhone) {
        query['reporter.phone'] = userPhone;
      } else {
        // No phone associated, return empty
        return res.json({
          success: true,
          data: [],
          totalPages: 0,
          currentPage: page,
          totalTickets: 0
        });
      }
    }

    if (status) query.status = status;
    if (emergencyType) query.emergencyType = emergencyType;
    if (priority) query.priority = priority;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const tickets = await Ticket.find(query)
      .populate('assignedOperator', 'username profile.fullName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: tickets,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalTickets: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};

// Get single ticket (supports both MongoDB _id and ticketId string)
exports.getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    let ticket;

    // Check if id looks like a ticketId (TD-...) or MongoDB ObjectId
    if (id.startsWith('TD-')) {
      // Search by ticketId field
      ticket = await Ticket.findOne({ ticketId: id })
        .populate('assignedOperator', 'username profile.fullName');
    } else {
      // Try as MongoDB ObjectId
      ticket = await Ticket.findById(id)
        .populate('assignedOperator', 'username profile.fullName');
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // If user is a reporter, verify they own this ticket
    if (req.user && req.user.role === 'reporter') {
      const userPhone = req.user.profile?.phone;
      if (!userPhone || ticket.reporter?.phone !== userPhone) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own tickets.'
        });
      }
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
};

// Update ticket (full update - admin only)
exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Emit update to all connected clients
    if (req.io) {
      req.io.emit('ticket_updated', ticket);
    }

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket',
      error: error.message
    });
  }
};

// Update ticket status only (for staff and admin)
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['URGENT', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateData = {
      status,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    // If status is RESOLVED, set resolvedAt
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    // Add notes if provided
    if (notes) {
      updateData.$push = { notes: `[${new Date().toISOString()}] ${req.user.username}: ${notes}` };
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedOperator', 'username profile.fullName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Emit update to all connected clients
    if (req.io) {
      req.io.emit('ticket_status_updated', {
        ticketId: ticket._id,
        status: ticket.status,
        updatedBy: req.user.username
      });
    }

    res.json({
      success: true,
      data: ticket,
      message: `Ticket status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
      error: error.message
    });
  }
};

// Add chat message to ticket
exports.addChatMessage = async (req, res) => {
  try {
    const { role, message } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.chatHistory.push({
      role,
      message,
      timestamp: new Date()
    });

    await ticket.save();

    // Emit to session room
    if (req.io) {
      req.io.to(ticket._id.toString()).emit('new_message', {
        ticketId: ticket._id,
        role,
        message,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: ticket.chatHistory[ticket.chatHistory.length - 1],
      message: 'Message added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// Generate PDF ticket
exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    let ticket;

    // Check if id looks like a ticketId (TD-...) or MongoDB ObjectId
    if (id.startsWith('TD-')) {
      // Search by ticketId field
      ticket = await Ticket.findOne({ ticketId: id })
        .populate('assignedOperator', 'username profile.fullName');
    } else {
      // Try as MongoDB ObjectId
      ticket = await Ticket.findById(id)
        .populate('assignedOperator', 'username profile.fullName');
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // If user is a reporter, verify they own this ticket
    if (req.user && req.user.role === 'reporter') {
      const userPhone = req.user.profile?.phone;
      if (!userPhone || ticket.reporter?.phone !== userPhone) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only download PDF for your own tickets.'
        });
      }
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
    const filename = `ticket_${ticket.ticketId}.pdf`;

    // Try to register a font that supports Vietnamese
    // Try multiple font sources in order of preference
    const fontPaths = [
      path.join(__dirname, '../fonts/Roboto-Regular.ttf'),  // Custom font in project
      'C:\\Windows\\Fonts\\arial.ttf',                       // Windows Arial
      'C:\\Windows\\Fonts\\times.ttf',                       // Windows Times New Roman
      '/System/Library/Fonts/Supplemental/Arial.ttf',       // macOS Arial
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'     // Linux DejaVu
    ];

    let fontLoaded = false;
    for (const fontPath of fontPaths) {
      try {
        if (fs.existsSync(fontPath)) {
          doc.registerFont('Vietnamese', fontPath);
          doc.font('Vietnamese');
          fontLoaded = true;
          console.log(`Loaded font from: ${fontPath}`);
          break;
        }
      } catch (err) {
        // Continue to next font
      }
    }
    
    if (!fontLoaded) {
      console.warn('Could not load any Vietnamese-compatible font, using default (may not display Vietnamese correctly)');
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Pipe PDF to response
    doc.pipe(res);

    // Handle pipe errors
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
    });

    // Add content to PDF with better formatting
    doc.fontSize(20).text('PHIẾU BÁO CÁO SỰ CỐ KHẨN CẤP - HOTLINE 112', {
      align: 'center'
    });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Mã phiếu: ${ticket.ticketId}`, 50, 100);
    doc.text(`Ngày tạo: ${new Date(ticket.createdAt).toLocaleString('vi-VN')}`, 50, 120);
    doc.text(`Trạng thái: ${ticket.status}`, 50, 140);
    doc.text(`Độ ưu tiên: ${ticket.priority}`, 50, 160);
    doc.moveDown(2);

    doc.fontSize(14).text('1. THÔNG TIN NGƯỜI BÁO CÁO:', { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(`Tên: ${ticket.reporter?.name || 'N/A'}`, 70);
    doc.text(`Số điện thoại: ${ticket.reporter?.phone || 'N/A'}`, 70);
    doc.text(`Email: ${ticket.reporter?.email || 'N/A'}`, 70);
    doc.moveDown(1.5);

    doc.fontSize(14).text('2. VỊ TRÍ SỰ CỐ:', { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(`Địa chỉ: ${ticket.location?.address || 'N/A'}`, 70);
    if (ticket.location?.district) {
      doc.text(`${ticket.location.ward || ''}, ${ticket.location.district}, ${ticket.location.city}`, 70);
    }
    doc.moveDown(1.5);

    doc.fontSize(14).text('3. LOẠI SỰ CỐ:', { underline: true });
    doc.fontSize(12).moveDown(0.5);
    const typeMap = {
      'FIRE_RESCUE': 'Phòng cháy chữa cháy và Cứu nạn cứu hộ',
      'MEDICAL': 'Cấp cứu y tế',
      'SECURITY': 'An ninh trật tự'
    };
    doc.text(typeMap[ticket.emergencyType] || ticket.emergencyType, 70);
    doc.moveDown(1.5);

    doc.fontSize(14).text('4. MÔ TẢ TÌNH HUỐNG:', { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(ticket.description || 'N/A', 70, doc.y, { width: 450 });
    doc.moveDown(1.5);

    doc.fontSize(14).text('5. SỐ NGƯỜI BỊ ẢNH HƯỞNG:', { underline: true });
    doc.fontSize(12).moveDown(0.5);
    doc.text(`Tổng số: ${ticket.affectedPeople?.total || 0}`, 70);
    doc.text(`Bị thương: ${ticket.affectedPeople?.injured || 0}`, 70);
    doc.text(`Nguy kịch: ${ticket.affectedPeople?.critical || 0}`, 70);
    doc.text(`Tử vong: ${ticket.affectedPeople?.deceased || 0}`, 70);
    doc.moveDown(1.5);

    doc.fontSize(14).text('6. HỖ TRỢ YÊU CẦU:', { underline: true });
    doc.fontSize(12).moveDown(0.5);
    const support = [];
    if (ticket.supportRequired?.police) support.push('Công an');
    if (ticket.supportRequired?.ambulance) support.push('Xe cấp cứu');
    if (ticket.supportRequired?.fireDepartment) support.push('Phòng cháy chữa cháy');
    if (ticket.supportRequired?.rescue) support.push('Cứu hộ');
    doc.text(support.length > 0 ? support.join(', ') : 'Không có yêu cầu cụ thể', 70);

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Only send JSON if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF',
        error: error.message
      });
    }
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const stats = await Ticket.aggregate([
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          urgentTickets: {
            $sum: { $cond: [{ $eq: ['$status', 'URGENT'] }, 1, 0] }
          },
          resolvedTickets: {
            $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    const byType = await Ticket.aggregate([
      {
        $group: {
          _id: '$emergencyType',
          count: { $sum: 1 }
        }
      }
    ]);

    const byPriority = await Ticket.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {},
        byType,
        byPriority
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};