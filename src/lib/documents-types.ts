export interface StoredPage {
  id: string;
  title: string;
  content: string;
  isShared?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  pages: StoredPage[];
  activePageId: string;
  ownerId?: string;
  isPublic?: boolean;
  sharedPageIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface StoredComment {
  id: string;
  documentId: string;
  pageId?: string;
  userId?: string;
  content: string;
  author: string;
  createdAt: number;
}
