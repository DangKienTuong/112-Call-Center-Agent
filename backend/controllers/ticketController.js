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
    const ticket = await Ticket.findById(req.params.id)
      .populate('assignedOperator', 'username profile.fullName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const doc = new PDFDocument();
    const filename = `ticket_${ticket.ticketId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('EMERGENCY REQUEST TICKET - HOTLINE 112', 50, 50);
    doc.fontSize(12).text(`Ticket ID: ${ticket.ticketId}`, 50, 100);
    doc.text(`Created: ${ticket.createdAt.toLocaleString('vi-VN')}`, 50, 120);
    doc.text(`Status: ${ticket.status}`, 50, 140);
    doc.text(`Priority: ${ticket.priority}`, 50, 160);

    doc.fontSize(14).text('1. REPORTER INFORMATION:', 50, 200);
    doc.fontSize(12).text(`Name: ${ticket.reporter.name}`, 70, 220);
    doc.text(`Phone: ${ticket.reporter.phone}`, 70, 240);
    doc.text(`Email: ${ticket.reporter.email || 'N/A'}`, 70, 260);

    doc.fontSize(14).text('2. INCIDENT LOCATION:', 50, 300);
    doc.fontSize(12).text(`Address: ${ticket.location.address}`, 70, 320);

    doc.fontSize(14).text('3. EMERGENCY TYPE:', 50, 360);
    doc.fontSize(12).text(ticket.emergencyType, 70, 380);

    doc.fontSize(14).text('4. SITUATION DESCRIPTION:', 50, 420);
    doc.fontSize(12).text(ticket.description, 70, 440, { width: 400 });

    doc.fontSize(14).text('5. AFFECTED PEOPLE:', 50, 520);
    doc.fontSize(12).text(`Total: ${ticket.affectedPeople.total} | Status: ${ticket.affectedPeople.status || 'Unknown'}`, 70, 540);

    doc.fontSize(14).text('6. SUPPORT REQUIRED:', 50, 580);
    const support = [];
    if (ticket.supportRequired.police) support.push('Police');
    if (ticket.supportRequired.ambulance) support.push('Ambulance');
    if (ticket.supportRequired.fireDepartment) support.push('Fire Department');
    if (ticket.supportRequired.rescue) support.push('Rescue Team');
    doc.fontSize(12).text(support.join(', ') || 'None specified', 70, 600);

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
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