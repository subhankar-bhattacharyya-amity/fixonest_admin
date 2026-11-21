import { useSelector } from "react-redux";

// Read-only access to the blog slice (table, summary and category options).
export function useBlogs() {
  return useSelector((state) => state.blog);
}
