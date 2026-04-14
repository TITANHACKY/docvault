export interface StoredPage {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  pages: StoredPage[];
  activePageId: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredComment {
  id: string;
  documentId: string;
  content: string;
  author: string;
  createdAt: number;
}
