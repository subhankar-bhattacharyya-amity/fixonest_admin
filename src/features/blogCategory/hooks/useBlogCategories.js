import { useSelector } from "react-redux";

// Read-only access to the blog category slice (table + summary).
export function useBlogCategories() {
  return useSelector((state) => state.blogCategory);
}
