import { useSelector } from "react-redux";

const EMPTY_SECTION = { items: [], status: "idle", error: null };

// Read-only access to one section's FAQs ({ items, status, error }), by the
// section's backend `category`.
export function useFaqs(category) {
  return useSelector((state) => state.faq.sections[category] ?? EMPTY_SECTION);
}
