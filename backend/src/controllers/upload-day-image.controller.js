// Upload a single image for itinerary day (used in day-editor)
export const uploadDayImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Upload to Cloudinary under itinerary-days folder
    const { url } = await uploadToCloudinary(req.file.buffer, 'travel-crm/itinerary-days');

    res.json({
      success: true,
      data: {
        url,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('[UploadDayImage] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
};

