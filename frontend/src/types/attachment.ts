export interface Attachment {
  _id: string;
  issueId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cloudinaryId: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xls';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip';
  if (mimeType.startsWith('text/')) return 'txt';
  return 'file';
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};
