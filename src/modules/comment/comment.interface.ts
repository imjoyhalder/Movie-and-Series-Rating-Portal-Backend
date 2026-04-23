export interface CreateCommentDto {
  reviewId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}
