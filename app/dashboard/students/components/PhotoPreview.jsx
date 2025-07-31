import React from 'react';

const PhotoPreview = ({ photoUrl }) => {
  // Helper function to convert Google Drive link to a direct image link
  const getDisplayableImageUrl = (url) => {
    if (!url || typeof url !== 'string') {
      return null;
    }

    if (url.includes("drive.google.com")) {
      const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/;
      const match = url.match(regex);
      
      if (match && match[1]) {
        const fileId = match[1];
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    
    return url;
  };

  if (!photoUrl) return null;

  return (
    <div className="mt-4">
      <p className="block text-sm font-medium text-gray-700 dark:text-gray-300">Photo Preview</p>
      <div className="mt-2">
        {photoUrl.includes("drive.google.com") ? (
          <iframe 
            src={getDisplayableImageUrl(photoUrl)}
            className="h-64 w-64 rounded-lg border border-gray-300"
            title="Student Photo Preview"
            frameBorder="0"
            allow="autoplay"
          />
        ) : (
          <img 
            src={getDisplayableImageUrl(photoUrl)} 
            alt="Student Preview" 
            className="h-64 w-64 rounded-lg object-cover shadow-md"
          />
        )}
      </div>
    </div>
  );
};

export default PhotoPreview;
