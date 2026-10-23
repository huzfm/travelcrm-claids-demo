import { getAuditLogs, exportAuditLogs, getLeadAuditTrail } from '../services/audit.service.js';
// import prisma from '../config/prisma.js';
export const getAuditLogsHandler = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      entity,
      entityId,
      userId,
      action,
      startDate,
      endDate,
    } = req.query;

    // ADMIN and MANAGER can access audit logs
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    const branchId = req.query.branchId;

    const result = await getAuditLogs({
      page,
      limit,
      entity,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      branchId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const exportAuditLogsHandler = async (req, res) => {
  try {
    const { startDate, endDate, entity, branchId } = req.query;

    // Only ADMIN can export audit logs
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    let filterBranchId = branchId;
    if (!branchId) {
      // ADMIN can export all
      filterBranchId = null;
    }

    const [headers, rows] = await exportAuditLogs({
      startDate,
      endDate,
      entity,
      branchId: filterBranchId,
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getLeadAuditTrailHandler = async (req, res) => {
  try {
    const { leadId } = req.params;

    const logs = await getLeadAuditTrail(leadId);

    res.json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    console.error('Get lead audit trail error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
