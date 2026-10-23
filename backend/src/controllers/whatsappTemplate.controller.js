// In-memory storage for templates (can be moved to database later)
let templates = [
  {
    id: '1',
    name: 'Welcome Message',
    content:
      'Hello {{name}}! Welcome to our travel agency. How can I help you plan your dream trip today?',
    category: 'greeting',
    isActive: true,
    usageCount: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Follow-up Message',
    content:
      'Hi {{name}}, just checking in on your travel plans. Have you had a chance to review the itineraries we sent?',
    category: 'followup',
    isActive: true,
    usageCount: 32,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Quote Ready',
    content:
      'Hello {{name}}! Your personalized travel quote is ready! Check out the itinerary we created for you. Let me know if you have any questions.',
    category: 'quote',
    isActive: true,
    usageCount: 28,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Thank You',
    content:
      'Thank you {{name}} for choosing us! We are excited to help you create amazing travel memories. Our team will be in touch soon.',
    category: 'confirmation',
    isActive: true,
    usageCount: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Itinerary Shared',
    content:
      'Hi {{name}}, we have shared your itinerary via the link below. Feel free to explore and let us know if you would like any changes.',
    category: 'itinerary',
    isActive: true,
    usageCount: 22,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getWhatsAppTemplates = async (req, res) => {
  try {
    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { category, isActive } = req.query;

    let filtered = [...templates];

    if (category) {
      filtered = filtered.filter(t => t.category === category);
    }

    if (isActive !== undefined) {
      filtered = filtered.filter(t => t.isActive === (isActive === 'true'));
    }

    res.json({
      success: true,
      data: filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createWhatsAppTemplate = async (req, res) => {
  try {
    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { name, content, category = 'general' } = req.body;

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required',
      });
    }

    // Extract variables from content
    const variables = content.match(/\{\{(\w+)\}\}/g) || [];

    const template = {
      id: String(Date.now()),
      name,
      content,
      category,
      variables: variables.map(v => v.replace(/\{\{|\}\}/g, '')),
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    templates.push(template);

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateWhatsAppTemplate = async (req, res) => {
  try {
    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { id } = req.params;
    const { name, content, category, isActive } = req.body;

    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (name !== undefined) templates[index].name = name;
    if (content !== undefined) {
      templates[index].content = content;
      const variables = content.match(/\{\{(\w+)\}\}/g) || [];
      templates[index].variables = variables.map(v => v.replace(/\{\{|\}\}/g, ''));
    }
    if (category !== undefined) templates[index].category = category;
    if (isActive !== undefined) templates[index].isActive = isActive;
    templates[index].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: templates[index],
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteWhatsAppTemplate = async (req, res) => {
  try {
    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { id } = req.params;
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    templates.splice(index, 1);

    res.json({
      success: true,
      data: { message: 'Template deleted successfully' },
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
